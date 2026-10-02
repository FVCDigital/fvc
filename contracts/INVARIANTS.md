# FVC Contract Invariants

Plain-English rules that must always hold. Use these for fuzzing, audits, and code review.

Status as of October 2026: invariant suites are complete for Vesting, Sale and Staking. Each handler
exposes its properties as `prop_*` functions, so Foundry (every push, and a deep campaign nightly) and
Medusa (nightly) check exactly the same rules. Halmos proves a subset symbolically every week. The
properties for the planned LoanRegistry are in [LOAN_REGISTRY.md](./LOAN_REGISTRY.md).

Staking properties 6, 9 and 16 are only partly covered: 6 is checked for every account except the one
that just claimed, 9 is enforced by a `require` rather than checked, and 16 has no dedicated check.

---

## Vesting.sol

### Solvency and accounting
1. `totalVesting <= token.balanceOf(vesting)` at all times
2. `totalVesting == sum over all schedules of (totalAmount - released)` for non-revoked schedules
3. `released <= totalAmount` for every schedule
4. `released <= vestedAmount(schedule)` for every schedule
5. `releasableAmount == vestedAmount - released` (and is 0 if revoked)

### Time and curve
6. Before cliff: `releasableAmount == 0`
7. At or after `startTime + duration`: `vestedAmount == totalAmount`
8. `vestedAmount` never decreases as time advances (fixed schedule)
9. `block.timestamp < startTime` implies `vestedAmount == 0` (views must not revert)

### Access and conservation
10. Only `msg.sender` can `release()` their own schedules
11. Revoking schedule A does not change schedule B's releasable amount
12. Tokens conserved: minted in == balance + released to beneficiaries + refunded to owner + emergency withdrawn
13. `createVestingSchedule` only succeeds if contract balance covers new `totalVesting`
14. `modifyVestingSchedule` only succeeds if contract balance covers new `totalVesting`

### Revoke semantics (v2)
15. After revoke: schedule is marked revoked, beneficiary received any vested-but-unclaimed amount, owner received unvested refund, `totalVesting` reduced by full outstanding obligation

---

## Sale.sol

### Raise accounting
1. `raised <= cap` always
2. `raised` only increases via `buy` / `buyWithETH`, never via `mintOTC`
3. Each successful `buy` increases `raised` by exactly the normalised USD amount (6 decimals)
4. Sale contract never holds FVC long-term (mints to buyer or vesting immediately)
5. Sale contract never holds stablecoins or ETH after a successful purchase (forwarded to `beneficiary`)

### Pricing
6. `tokenAmount == (normalizedUsd * 1e18) / effectiveRate` for every purchase (integer division rounds down)
7. `effectiveRate` is investor custom rate if allowlisted with `rate > 0`, else global `rate`
8. `rate > 0` and `cap > 0` whenever sale can accept purchases

### Oracle / ETH
9. `buyWithETH` only succeeds when `_getEthUsdPrice() > 0`
10. If oracle answer is stale (`block.timestamp - updatedAt > stalenessThreshold`) or non-positive, fallback to `ethUsdRate`
11. If oracle unavailable and `ethUsdRate == 0`, ETH purchases revert
12. Oracle price normalised to 6 decimals before use

### Vesting path
13. If vesting path taken: FVC minted to `vestingContract` and schedule created atomically in same tx
14. Vesting path when: `vestingContract != 0` AND (`vestingThreshold == 0` OR purchase >= threshold OR investor allowlisted)
15. `createVestingSchedule` only succeeds if Sale is `owner()` of Vesting contract
16. `cliff <= duration` for any schedule created (defaults and custom terms)

### Allowlist
17. If `terms.active` and `maxAmount > 0`: `terms.spent <= maxAmount` always
18. Each allowlisted purchase increases `terms.spent` by purchase USD
19. `setInvestorTerms` / batch reset `spent` to 0 (documented behaviour: re-grant wipes history)

### Access
20. `buy` / `buyWithETH` revert when `!active`
21. `buy` reverts for non-accepted tokens or zero amount
22. Only owner can change rate, cap, oracle, vesting config, allowlist, `mintOTC`

### Cap edge cases (watch)
- `setCap(newCap)` does not require `newCap >= raised` (**confirmed by fuzzer**: buy then `setCap` below `raised` breaks invariant #1)
- Allowlist sale on wrong Vesting owner reverts every buy (operational, not token loss)

---

## Staking.sol

### Stake accounting
1. `_totalSupply == sum of _balances[user]` over all users
2. `balanceOf(user) <= _totalSupply` for every user
3. Contract `stakingToken` balance >= `_totalSupply` always
4. `_totalSupply` only changes via `stake`, `withdraw`, `exit`

### Reward accounting (Synthetix pattern)
5. `rewardPerToken` is monotonically non-decreasing over time
6. `earned(user)` is non-decreasing between user actions (until `getReward` / `exit` zeros `rewards[user]`)
7. Sum of all unpaid `earned(user)` <= `rewardsToken.balanceOf(staking)` (solvency)
8. After `getReward` or `exit`: `rewards[user] == 0` and user received that amount in `rewardsToken`
9. `rewardRate <= rewardsToken.balance / rewardsDuration` after every `notifyRewardAmount`

### Funding (watch)
- Property 7 only holds if every `notifyRewardAmount(reward)` is preceded by a transfer of `reward`
  USDC. The balance check in `notifyRewardAmount` counts rewards already earned but not yet claimed,
  so a second unfunded call passes it. Reproduced: 7,000 USDC funded, `notifyRewardAmount(7000e6)`
  called twice, about 14,000 USDC owed against 7,000 held, and the staker's `getReward` reverts. The
  Foundry handler always funds first, which encodes the operational rule. Staking is not deployed, so
  the fix (pull the tokens inside `notifyRewardAmount`) can land before mainnet.

### Time
10. `lastTimeRewardApplicable() <= block.timestamp`
11. `lastTimeRewardApplicable() <= periodFinish`
12. Rewards accrue only between `lastUpdateTime` and `lastTimeRewardApplicable()`

### Access
13. Users can only withdraw/claim their own balance and rewards
14. `recoverERC20` cannot drain `stakingToken` or `rewardsToken`
15. `setRewardsDuration` only after `periodFinish` has passed

### Cross-user fairness
16. Staking more increases `earned` proportionally (no user earns more than their stake share of `rewardPerToken` delta)

---

## Cross-contract (FVC system)

1. `FVC.totalSupply()` increases only via `mint` by addresses with `MINTER_ROLE`
2. Sale + OTC mint paths are the only production minters
3. FVC in Vesting == obligations tracked by `totalVesting` (per Vesting invariants)
4. Investor claimable FVC on dashboard == sum of `releasableAmount` across their schedules

---

## Bugs found via invariants

| Invariant | Violation | Fixed in source? | On mainnet? |
|---|---|---|---|
| #1 modify balance | modify without balance check | Yes (local) | No (v1 immutable) |
| #2 revoke accounting | partial revoke stranded vested tokens | Yes (local) | No |
| #9 startTime views | underflow before start | Yes (local) | No |
| Sale #15 | allowlist sale not Vesting owner | N/A (config) | Broken sale only |
| Staking #7 | unfunded `notifyRewardAmount` makes rewards insolvent | No (decision pending) | Not deployed |

Mainnet v1: release path fine for existing schedules. Use Vesting v2 for new allocations.
