# LoanRegistry v1: frozen specification

Status: **frozen for v1 on 19 Nov 2026 (phase S1)**. Not implemented; nothing exists in
`src/loan/` yet. Any change to this file after the freeze needs Igli's approval in a PR that also
updates [INVARIANTS.md](./INVARIANTS.md) and the tests.

Read with:

- [`docs/specs/loan-registry-plan.md`](../docs/specs/loan-registry-plan.md): why each security
  and build decision was made (SD1 to SD12, BD1 to BD14), the threat model and the phases.
- [`INVARIANTS.md`](./INVARIANTS.md): the numbered properties (1 to 20, C1 to C6, S1 to S12)
  that every test and fuzzer checks.
- [`SOL_DEVELOPMENT.md`](./SOL_DEVELOPMENT.md): the TDD workflow.

How to use this file: every function in section 6 lists who may call it, how long the call waits,
the checks in the order they run, what changes, what it emits and which invariants it touches.
If the contract and this file disagree, the contract is wrong.

---

## 1. What it is

LoanRegistry is FVC's public ledger of SME loans. It connects three things that otherwise live in
separate places:

1. The **legal agreement**, signed off-chain (Legal Bison template).
2. The **fiat leg**, handled by the payments partner: GBP payouts to the SME and GBP repayments
   from it.
3. The **stablecoin leg** on Ethereum, which moves through the registry and eventually reaches
   stakers.

Every payout, repayment and collateral movement is recorded in the same transaction that moves
the stablecoins. That is the core design choice: a log that only says "the operator reports
£1,000 arrived" cannot be checked, but a record that pulls the tokens in can. It turns "every
repayment is backed" from a promise into an invariant the fuzzers check.

## 2. What it is not

- **Not a lending pool.** Credit decisions happen off-chain.
- **Not a payment processor.** Cards, direct debit and bank transfers are the partner's job.
- **Not a currency converter.** The GBP figure comes from the partner. The contract stores it and
  only sanity-checks it against the token amount (section 5.1).
- **Not a store of personal data.** No names, company numbers or bank details, in storage or in
  events.
- **Not upgradeable.** A change means a new deployment and a migration (SD5).
- **Not the treasury.** It holds only money in transit (repayments waiting to be forwarded) and
  collateral. The Safe holds the treasury.

---

## 3. End-to-end flow

```
SME signs agreement (off-chain)
  -> Safe: createLoan(agreementHash, smeRef, facilityGbp, feeGbp)
  -> Safe: recordDisbursement(...)        stablecoin Safe -> registry -> partner deposit address
     partner pays GBP to the SME's bank
  -> SME repays GBP to the partner with its reference
     partner converts and sends stablecoin to the Safe, with a settlement message
  -> reconciler matches the message to a loan and proposes a Safe batch (approve + recordRepayment)
  -> Safe signers check and sign: recordRepayment(...)   stablecoin Safe -> registry
  -> Safe: forward(token, amount, safe)    stablecoin registry -> Safe
  -> Safe swaps to USDC if needed (BD9) and calls Staking.notifyRewardAmount
```

Collateral follows the same path: `depositCollateral` pulls it in from the Safe;
`releaseCollateral` sends it back out to the partner (for the SME) or the Safe.

---

## 4. Units and money model

| Quantity | Unit | Notes |
|---|---|---|
| Every GBP amount | pence, `uint256` | £50,000 is `5_000_000` |
| Every token amount | the token's smallest unit | USDC and USDT: 6 decimals |
| Rate band | basis points of whole tokens per £1 | 1.27 USDC per £1 is `12_700` |
| Day for limits | UTC day, `block.timestamp / 1 days` | resets at 00:00 UTC |

**What the SME owes.** FVC's facilities are interest-free; the SME repays what it drew plus an
optional fixed fee agreed in the agreement (BD7):

```
owedGbp        = disbursedGbp + feeGbp
outstandingGbp = owedGbp - repaidGbp
```

A repayment that would take `repaidGbp` above `owedGbp` reverts (BD8). The excess is refunded to
the SME off-chain by the partner.

**When a loan is repaid.** Only when drawing is closed (the full facility drawn, or
`closeFacility` called) **and** `repaidGbp == owedGbp`. A loan repaid in full while drawing is
still open stays `Active`, because FVC may still pay out another tranche.

### Worked example

Facility £50,000, fee £0, USDC at 1.27 per £1.

| Step | Call | disbursed | owed | repaid | status |
|---|---|---|---|---|---|
| 1 | `createLoan(h, ref, 5_000_000, 0)` | 0 | 0 | 0 | Active |
| 2 | `recordDisbursement(1, 2_000_000, USDC, 25_400e6, p1, partner)` | £20,000 | £20,000 | 0 | Active |
| 3 | `recordRepayment(1, 200_000, USDC, 2_540e6, s1)` | £20,000 | £20,000 | £2,000 | Active |
| 4 | `recordRepayment(1, 2_000_000, ...)` | | | | reverts: £22,000 > £20,000 owed |
| 5 | `closeFacility(1)` | £20,000 | £20,000 | £2,000 | Active, drawing closed |
| 6 | `recordRepayment(1, 1_800_000, USDC, 22_860e6, s2)` | £20,000 | £20,000 | £20,000 | Repaid |

Step 2 checks the rate: `25_400e6 * 1e6` must sit between `11_000 * 2_000_000 * 1e6` and
`15_000 * 2_000_000 * 1e6`. It does (12,700 bps). Entering `20_000` pence (pounds typed as pence)
for the same token amount gives 1,270,000 bps and reverts.

---

## 5. Storage

```solidity
enum Status { Active, Repaid, Defaulted, WrittenOff }   // 0, 1, 2, 3

struct Loan {
    bytes32 agreementHash;   // keccak256 of the signed agreement PDF
    bytes32 smeRef;          // keccak256(abi.encode(internalSmeId, perLoanSalt)) (BD10)
    uint256 facilityGbp;     // most FVC agreed to pay out, pence
    uint256 feeGbp;          // fixed fee, pence, default 0
    uint256 disbursedGbp;    // paid out so far, pence
    uint256 repaidGbp;       // counted against owedGbp so far, pence
    uint64  createdAt;
    Status  status;
    bool    drawingClosed;   // no more tranches once true; never reset
}

struct TokenConfig {
    bool    allowed;         // accepted for new inflows and tranches
    bool    known;           // ever allowed; decimals and band are set
    uint8   decimals;        // read once from the token on first allowToken
    uint32  minRateBps;      // band lower bound
    uint32  maxRateBps;      // band upper bound
    uint256 maxPayout;       // largest single transfer out, token units
    uint256 dailyLimit;      // most out per UTC day, token units
}

address public immutable safe;                // the one Safe (BD1); always a destination
uint256 public maxFacilityGbp;                // per-loan cap, pence
uint256 public loanCount;                     // ids start at 1

mapping(uint256 => Loan) public loans;
mapping(address => TokenConfig) public tokenConfig;
mapping(address => bool) public approvedDestination;
mapping(bytes32 => bool) public refUsed;      // payout, settlement and collateral refs share one set

mapping(uint256 => mapping(address => uint256)) public loanReceived;    // repayments per loan, token
mapping(uint256 => mapping(address => uint256)) public collateralHeld;  // collateral per loan, token
mapping(address => uint256) public totalReceived;       // repayments per token, all loans
mapping(address => uint256) public totalForwarded;      // repayments sent on, per token
mapping(address => uint256) public totalCollateralHeld; // per token
uint256 public totalRepaidGbp;

mapping(address => uint256) public outflowDay;     // UTC day of the last counted outflow
mapping(address => uint256) internal _outflowUsed; // amount counted on that day
```

**Why one reference set.** A payout reference, a settlement reference and a collateral reference
are all hashes of partner IDs. Sharing one set means the same partner message can never be
recorded twice under two different functions.

### 5.1 The rate band (SD8)

For every call that records a GBP figure next to a token amount, with `d = decimals`:

```
tokenAmount * 1e6 >= minRateBps * gbpAmount * 10**d
tokenAmount * 1e6 <= maxRateBps * gbpAmount * 10**d
```

Cross-multiplied so nothing is divided or rounded. `1e6` is `10_000` bps times 100 pence.
Default bands: USDC and USDT `11_000` to `15_000`; a GBP stablecoin about `9_800` to `10_200`; a CHF
stablecoin set when it is allowed. It catches the costly typo (pence entered as pounds is 100 times
off), not small FX moves.

### 5.2 Internal helpers

Every token movement goes through one of two helpers, so each control lives in exactly one place.

| Helper | Does | Reverts with |
|---|---|---|
| `_pullExact(token, amount)` | `safeTransferFrom(msg.sender, this, amount)`; credits only the measured balance increase, which must equal `amount` | `BalanceMismatch` |
| `_pushTo(token, amount, to)` | checks `approvedDestination[to]`, `amount <= maxPayout`, today's total plus `amount <= dailyLimit`, then counts it and `safeTransfer`s | `DestinationNotApproved`, `PayoutLimitExceeded`, `DailyLimitExceeded` |
| `_checkRate(token, gbp, amount)` | section 5.1 | `RateOutOfBand` |
| `_useRef(ref)` | `ref != 0`, unused, then marks used | `ZeroRef`, `RefAlreadyUsed` |
| `_settleIfRepaid(loanId)` | moves `Active` or `Defaulted` to `Repaid` when drawing is closed and `repaidGbp == owedGbp`; emits `LoanRepaid` | none |

Tokens are only ever pulled from `msg.sender` (S6), never from an address passed as an argument.

---

## 6. Functions

Order of checks in every state-changing function: role, pause, loan exists and status, token,
non-zero inputs, reference, bounds, rate band, then effects, then token transfers
(checks-effects-interactions). Every function that moves tokens is `nonReentrant`.

"Paused" means the function reverts with `Pausable: paused` while paused (S9).

### 6.1 Constructor

`constructor(address timelock, address safe_, uint256 maxFacilityGbp_)`

- Reverts `ZeroAddress` if either address is zero, `ZeroAmount` if `maxFacilityGbp_ == 0`.
- Grants `DEFAULT_ADMIN_ROLE` to `timelock` only. Grants `ORIGINATOR_ROLE`, `RECORDER_ROLE`,
  `RISK_ROLE`, `DISTRIBUTOR_ROLE` and `GUARDIAN_ROLE` to `safe_`.
- Sets `approvedDestination[safe_] = true`. No tokens are allowed yet; the deploy script queues
  `allowToken` and `addDestination` through the timelock.
- The timelock is OpenZeppelin `TimelockController` with `minDelay = 48 hours`, the Safe as only
  proposer, executor and canceller, and no admin (SD9). The registry does not check this; the
  deploy test does.

### 6.2 Loans and tranches (`ORIGINATOR_ROLE`, no delay)

| Function | Checks (in order) | Effects | Emits | Invariants |
|---|---|---|---|---|
| `createLoan(bytes32 agreementHash, bytes32 smeRef, uint256 facilityGbp, uint256 feeGbp) returns (uint256 loanId)` | role; not paused; `agreementHash != 0`, `smeRef != 0`; `facilityGbp != 0`; `facilityGbp <= maxFacilityGbp` | new loan `++loanCount`, `Active`, `createdAt = block.timestamp` | `LoanCreated(loanId, agreementHash, smeRef, facilityGbp, feeGbp)` | 15, 16, 20, S3 |
| `recordDisbursement(uint256 loanId, uint256 gbpAmount, address token, uint256 tokenAmount, bytes32 payoutRef, address to)` | role; not paused; loan exists, `Active`, drawing open; token allowed; both amounts `!= 0`; `_useRef(payoutRef)`; `disbursedGbp + gbpAmount <= facilityGbp`; rate band | `disbursedGbp += gbpAmount`; if it now equals `facilityGbp`, `drawingClosed = true`; `_pullExact`, then `_pushTo(token, tokenAmount, to)` | `TrancheDisbursed(loanId, gbpAmount, token, tokenAmount, payoutRef, to)`, and `FacilityClosed(loanId, disbursedGbp)` if it closed | 1, 15a, 15b, S1 to S6 |
| `closeFacility(uint256 loanId)` | role; not paused; loan `Active`; drawing open | `drawingClosed = true`; `_settleIfRepaid` | `FacilityClosed(loanId, disbursedGbp)` | 14, 15b |

### 6.3 Repayments and collateral in (`RECORDER_ROLE`, no delay)

| Function | Checks (in order) | Effects | Emits | Invariants |
|---|---|---|---|---|
| `recordRepayment(uint256 loanId, uint256 gbpAmount, address token, uint256 tokenAmount, bytes32 settlementRef)` | role; not paused; loan `Active` or `Defaulted`; token allowed; amounts `!= 0`; `_useRef`; `repaidGbp + gbpAmount <= owedGbp`; rate band | `repaidGbp`, `loanReceived`, `totalReceived`, `totalRepaidGbp` increase; `_pullExact`; `_settleIfRepaid` | `RepaymentRecorded(loanId, gbpAmount, token, tokenAmount, settlementRef)` | 1 to 9, 13, 14, S4 to S6 |
| `depositCollateral(uint256 loanId, address token, uint256 tokenAmount, uint256 gbpAmount, bytes32 ref)` | role; not paused; loan `Active`; token allowed; amounts `!= 0`; `_useRef`; rate band | `collateralHeld`, `totalCollateralHeld` increase; `_pullExact` | `CollateralDeposited(loanId, token, tokenAmount, gbpAmount, ref)` | C1, C5, C6, S4 to S6 |

### 6.4 Lifecycle and collateral out (`RISK_ROLE`, no delay)

| Function | Checks (in order) | Effects | Emits | Invariants |
|---|---|---|---|---|
| `markDefault(uint256 loanId)` | role; not paused; `Active` | `Defaulted` | `LoanStatusChanged(loanId, Active, Defaulted)` | 12 |
| `cure(uint256 loanId)` | role; not paused; `Defaulted` | `Active` | `LoanStatusChanged(loanId, Defaulted, Active)` | 12 |
| `writeOff(uint256 loanId)` | role; not paused; `Defaulted` | `WrittenOff` (terminal) | `LoanStatusChanged(loanId, Defaulted, WrittenOff)` | 12 |
| `claimCollateral(uint256 loanId, address token, uint256 tokenAmount, uint256 gbpAmount, bytes32 ref)` | role; not paused; `Defaulted`; `tokenConfig.known`; amounts `!= 0`; `tokenAmount <= collateralHeld`; `_useRef`; `gbpAmount <= outstandingGbp`; rate band | collateral moves into repayment accounting: `collateralHeld`, `totalCollateralHeld` decrease; `loanReceived`, `totalReceived`, `repaidGbp`, `totalRepaidGbp` increase; no tokens move; `_settleIfRepaid` | `CollateralClaimed(loanId, token, tokenAmount, gbpAmount, ref)` | C1, C4, C5, 2, S10 |
| `releaseCollateral(uint256 loanId, address token, uint256 tokenAmount, address to)` | role; not paused; `Repaid` or `WrittenOff`; amount `!= 0`; `tokenAmount <= collateralHeld` | `collateralHeld`, `totalCollateralHeld` decrease; `_pushTo` | `CollateralReleased(loanId, token, tokenAmount, to)` | C1, C3, C5, S1, S2 |

`releaseCollateral` and `claimCollateral` work for a token that has since been disallowed
(`known` but not `allowed`), so a disallowed token's collateral is never stuck.

### 6.5 Forwarding (`DISTRIBUTOR_ROLE`, no delay)

| Function | Checks (in order) | Effects | Emits | Invariants |
|---|---|---|---|---|
| `forward(address token, uint256 amount, address to)` | role; not paused; amount `!= 0`; `totalForwarded + amount <= totalReceived` | `totalForwarded += amount`; `_pushTo` | `Forwarded(token, amount, to)` | 6, 7, 8, C2, S1, S2 |

In v1 `to` is the Safe, which swaps to USDC if needed and funds Staking (BD9).

### 6.6 Reduce-only controls (`GUARDIAN_ROLE`, no delay, work while paused)

These can only make the contract more restrictive (S8). The Safe holds the role (SD6).

| Function | Checks | Effects | Emits |
|---|---|---|---|
| `pause()` | role; not paused | paused | `Paused(account)` (OpenZeppelin) |
| `removeDestination(address to)` | role; `to != safe`; currently approved | not approved | `DestinationRemoved(to)` |
| `disallowToken(address token)` | role; currently allowed | `allowed = false` (`known` stays) | `TokenDisallowed(token)` |
| `lowerTokenLimits(address token, uint256 maxPayout, uint256 dailyLimit)` | role; `known`; each value `<=` its current value | set | `TokenLimitsSet(token, maxPayout, dailyLimit)` |
| `lowerMaxFacility(uint256 newMax)` | role; `newMax <= maxFacilityGbp` | set | `MaxFacilitySet(newMax)` |

The Safe cannot be removed as a destination, so repayments and collateral can always go home.

### 6.7 Admin (`DEFAULT_ADMIN_ROLE` = the timelock, 48 hour delay, work while paused)

| Function | Checks | Effects | Emits |
|---|---|---|---|
| `unpause()` | role; paused | unpaused | `Unpaused(account)` |
| `addDestination(address to)` | role; `to != 0`; not approved | approved | `DestinationAdded(to)` |
| `allowToken(address token, uint32 minRateBps, uint32 maxRateBps, uint256 maxPayout, uint256 dailyLimit)` | role; `token != 0`; `0 < minRateBps <= maxRateBps`; `maxPayout <= dailyLimit` | first time: reads and stores `decimals()`, sets `known`; sets `allowed`, band and limits | `TokenAllowed(token, decimals, minRateBps, maxRateBps, maxPayout, dailyLimit)` |
| `setRateBand(address token, uint32 minRateBps, uint32 maxRateBps)` | role; `known`; `0 < min <= max` | set | `RateBandSet(token, minRateBps, maxRateBps)` |
| `setTokenLimits(address token, uint256 maxPayout, uint256 dailyLimit)` | role; `known`; `maxPayout <= dailyLimit` | set (may raise) | `TokenLimitsSet(token, maxPayout, dailyLimit)` |
| `setMaxFacility(uint256 newMax)` | role; `newMax != 0` | set (may raise) | `MaxFacilitySet(newMax)` |
| `recoverSurplus(address token)` | role; surplus `!= 0` | sends `balanceOf(this) - (totalReceived - totalForwarded) - totalCollateralHeld` to `safe` | `SurplusRecovered(token, amount)` |
| `grantRole` / `revokeRole` | OpenZeppelin `AccessControl` | | `RoleGranted`, `RoleRevoked` |

`recoverSurplus` always pays the Safe and is not counted against the outflow limits: it is already
behind the 48 hour delay and can only move tokens the registry does not owe anyone (S10). It
works for tokens that were never allowed (surplus is then the whole balance).

### 6.8 Views (never revert, invariant 19)

| View | Returns |
|---|---|
| `loans(id)` | the struct; all zero for an unknown id |
| `owedGbp(id)` | `disbursedGbp + feeGbp` |
| `outstandingGbp(id)` | `owedGbp - repaidGbp`; 0 for an unknown id |
| `outflowUsedToday(token)` | today's counted outflow; 0 if the last outflow was on an earlier day |
| `surplus(token)` | what `recoverSurplus` would send |
| all public mappings above | as stored |

---

## 7. Roles

| Role | Holder | Delay |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | TimelockController (Safe proposes, executes, cancels) | 48 hours |
| `ORIGINATOR_ROLE` | Safe | none |
| `RECORDER_ROLE` | Safe | none |
| `RISK_ROLE` | Safe | none |
| `DISTRIBUTOR_ROLE` | Safe | none |
| `GUARDIAN_ROLE` | Safe; a fast-pause wallet may be granted later through the timelock | none |

Every money path is bound by approved destinations, limits and the rate band whoever calls it. No
bot or hot wallet holds a role; the reconciler only proposes Safe transactions (SD4). The Safe's
threshold (2-of-4 now, 3-of-5 before mainnet) is not visible to the contract (BD1).

---

## 8. Events and errors

### Events

```solidity
event LoanCreated(uint256 indexed loanId, bytes32 agreementHash, bytes32 smeRef, uint256 facilityGbp, uint256 feeGbp);
event TrancheDisbursed(uint256 indexed loanId, uint256 gbpAmount, address indexed token, uint256 tokenAmount, bytes32 indexed payoutRef, address to);
event FacilityClosed(uint256 indexed loanId, uint256 disbursedGbp);
event RepaymentRecorded(uint256 indexed loanId, uint256 gbpAmount, address indexed token, uint256 tokenAmount, bytes32 indexed settlementRef);
event LoanRepaid(uint256 indexed loanId, uint256 repaidGbp);
event LoanStatusChanged(uint256 indexed loanId, Status from, Status to);
event CollateralDeposited(uint256 indexed loanId, address indexed token, uint256 tokenAmount, uint256 gbpAmount, bytes32 indexed ref);
event CollateralClaimed(uint256 indexed loanId, address indexed token, uint256 tokenAmount, uint256 gbpAmount, bytes32 indexed ref);
event CollateralReleased(uint256 indexed loanId, address indexed token, uint256 tokenAmount, address to);
event Forwarded(address indexed token, uint256 amount, address indexed to);
event DestinationAdded(address indexed to);
event DestinationRemoved(address indexed to);
event TokenAllowed(address indexed token, uint8 decimals, uint32 minRateBps, uint32 maxRateBps, uint256 maxPayout, uint256 dailyLimit);
event TokenDisallowed(address indexed token);
event RateBandSet(address indexed token, uint32 minRateBps, uint32 maxRateBps);
event TokenLimitsSet(address indexed token, uint256 maxPayout, uint256 dailyLimit);
event MaxFacilitySet(uint256 maxFacilityGbp);
event SurplusRecovered(address indexed token, uint256 amount);
```

`LoanRepaid` is emitted together with `LoanStatusChanged(id, from, Repaid)`.

### Errors (BD5)

All named `LoanRegistry__<Reason>`:

`ZeroAddress`, `ZeroAmount`, `ZeroHash`, `ZeroRef`, `RefAlreadyUsed`, `LoanNotFound`,
`InvalidStatus(Status current)`, `DrawingClosed`, `FacilityExceeded`, `MaxFacilityExceeded`,
`OwedExceeded`, `CollateralExceeded`, `OutstandingExceeded`, `ForwardExceeded`,
`TokenNotAllowed`, `TokenUnknown`, `InvalidRateBand`, `RateOutOfBand`, `BalanceMismatch`,
`DestinationNotApproved`, `DestinationAlreadyApproved`, `CannotRemoveSafe`,
`PayoutLimitExceeded`, `DailyLimitExceeded`, `InvalidLimits`, `NotALowering`, `NoSurplus`.

Role failures use OpenZeppelin's `AccessControl` revert string; pause failures use `Pausable`'s.

Which check raises which error:

| Check | Error |
|---|---|
| A zero address argument (constructor, `addDestination`, `allowToken`) | `ZeroAddress` |
| A zero GBP or token amount, zero `maxFacilityGbp` or `newMax` | `ZeroAmount` |
| `agreementHash == 0` or `smeRef == 0` | `ZeroHash` |
| A zero ref; a ref already used | `ZeroRef`; `RefAlreadyUsed` |
| `loanId == 0` or `loanId > loanCount` | `LoanNotFound` |
| Status not allowed for the call | `InvalidStatus(current)` |
| Tranche or `closeFacility` after drawing closed | `DrawingClosed` |
| Tranche past `facilityGbp` | `FacilityExceeded` |
| `createLoan` above `maxFacilityGbp` | `MaxFacilityExceeded` |
| Repayment past `owedGbp` | `OwedExceeded` |
| Claim or release above `collateralHeld` | `CollateralExceeded` |
| Claim crediting more than `outstandingGbp` | `OutstandingExceeded` |
| `forward` past `totalReceived - totalForwarded` | `ForwardExceeded` |
| Inflow or tranche with a token not `allowed`; `disallowToken` on one not allowed | `TokenNotAllowed` |
| Band, limits or claim on a token never allowed | `TokenUnknown` |
| `minRateBps == 0` or `minRateBps > maxRateBps` | `InvalidRateBand` |
| Recorded pair outside the band | `RateOutOfBand` |
| Measured balance increase differs from the amount | `BalanceMismatch` |
| Push to an address not approved; `removeDestination` on one not approved | `DestinationNotApproved` |
| `addDestination` on one already approved | `DestinationAlreadyApproved` |
| `removeDestination(safe)` | `CannotRemoveSafe` |
| Single transfer above `maxPayout` | `PayoutLimitExceeded` |
| Today's outflow would pass `dailyLimit` | `DailyLimitExceeded` |
| `maxPayout > dailyLimit` in `allowToken` or `setTokenLimits` | `InvalidLimits` |
| A guardian "lower" call that raises any value | `NotALowering` |
| `recoverSurplus` with nothing to recover | `NoSurplus` |

---

## 9. Threat model

The full table (T1 to T14) with impacts is in `loan-registry-plan.md` section 3. In short:

| Threat | Control in this contract |
|---|---|
| Two Safe keys stolen or signers tricked | Approved destinations, limits, delayed unpause and admin changes; honest signers pause and cancel |
| Reconciler compromised | Holds no role; signers verify every batch |
| Pence and pounds mixed up | Rate band; owed bound |
| Same settlement recorded twice | One shared reference set |
| Odd tokens (USDT, fee on transfer, `false` returns) | `SafeERC20`; measured balance increase must equal the amount |
| Reentrancy | Only allowed tokens; checks-effects-interactions; `nonReentrant` |
| Collateral paid to stakers | `forward` bounded by repayments received minus forwarded |
| Third-party approvals abused | Pull only from `msg.sender` |
| Personal data leak | Salted per-loan `smeRef`, nothing personal in events |
| Unbounded loops | None over user data |

Not covered here: the Safe's own balance (Safe hardening H1 to H5), the accuracy of the partner's
GBP figure beyond the band, issuer freezes of USDC or USDT.

---

## 10. Mutation labels

Each label is a guard that `scripts/mutate.ts` removes. A test must fail when it is removed. The
test names below are the ones phase S2 writes.

| Label | Guard removed | Invariant | Killing test (`describe` / `it`) |
|---|---|---|---|
| L01 | `ORIGINATOR_ROLE` on `createLoan` | 16 | createLoan / reverts for a non-originator |
| L02 | `facilityGbp != 0` | 15 | createLoan / reverts on a zero facility |
| L03 | pause check on `createLoan` | 18 | createLoan / reverts while paused |
| L04 | `disbursedGbp + gbp <= facilityGbp` | 15a | recordDisbursement / reverts one penny over the facility |
| L05 | `payoutRef` used once | 1 | recordDisbursement / reverts on a reused payout ref |
| L06 | drawing-closed check on tranche | 15b | recordDisbursement / reverts after closeFacility |
| L07 | token allowed on tranche | 10 | recordDisbursement / reverts for a disallowed token |
| L08 | `settlementRef` used once | 1 | recordRepayment / reverts on a reused settlement ref |
| L09 | `repaidGbp + gbp <= owedGbp` | 2 | recordRepayment / reverts one penny over owed |
| L10 | token allowed on repayment | 10 | recordRepayment / reverts for a disallowed token |
| L11 | pull before credit (`_pullExact` call) | 6 | recordRepayment / registry balance rises by tokenAmount |
| L12 | automatic move to `Repaid` | 14 | recordRepayment / final repayment marks the loan Repaid |
| L13 | `RECORDER_ROLE` on `recordRepayment` | 16 | recordRepayment / reverts for a non-recorder |
| L14 | `markDefault` only from `Active` | 12 | lifecycle / every disallowed transition reverts |
| L15 | `cure` only from `Defaulted` | 12 | lifecycle / every disallowed transition reverts |
| L16 | `writeOff` only from `Defaulted` | 12 | lifecycle / every disallowed transition reverts |
| L17 | `RISK_ROLE` on lifecycle | 16 | lifecycle / reverts for a non-risk caller |
| L18 | release only on `Repaid` or `WrittenOff` | C3 | releaseCollateral / reverts on an Active loan |
| L19 | claim only on `Defaulted` | C4 | claimCollateral / reverts on an Active loan |
| L20 | claim bounded by collateral held | C4 | claimCollateral / reverts above held |
| L21 | claim bounded by outstanding | C4 | claimCollateral / reverts above outstanding |
| L22 | collateral excluded from forward | C2 | forward / cannot move collateral |
| L23 | `totalForwarded + amount <= totalReceived` | 8 | forward / reverts above received minus forwarded |
| L24 | `DISTRIBUTOR_ROLE` on `forward` | 16 | forward / reverts for a non-distributor |
| L25 | destination check on tranche | S1 | security / tranche to an unapproved address reverts |
| L26 | destination check on release | S1 | security / release to an unapproved address reverts |
| L27 | destination check on forward | S1 | security / forward to an unapproved address reverts |
| L28 | `facilityGbp <= maxFacilityGbp` | S3 | security / createLoan above the per-loan limit reverts |
| L29 | `amount <= maxPayout` | S3 | security / transfer one unit over the payout limit reverts |
| L30 | daily limit | S2 | security / second transfer past the daily limit reverts, next UTC day succeeds |
| L31 | rate band lower bound | S4 | security / rate one bps under the band reverts |
| L32 | rate band upper bound | S4 | security / rate one bps over the band reverts |
| L33 | measured balance equals amount | S5 | security / fee-on-transfer token reverts |
| L34 | `unpause` is admin only | S7, S8 | security / guardian cannot unpause |
| L35 | raising limits is admin only | S7, S8 | security / guardian cannot raise a limit |
| L36 | stored decimals used in the band | S11 | security / 18-decimal token checked with its own decimals |
| L37 | `recoverSurplus` bounded by surplus | S10 | security / recoverSurplus leaves repayments and collateral |

L22 and L23 are the same line in the minimal design (`forward` is bounded by received minus
forwarded, which excludes collateral by construction). Both labels stay so each has a named test.

---

## 11. How it is tested

| Layer | Covers | Where | Phase |
|---|---|---|---|
| Hardhat unit | Every function: happy path, wrong role, paused, zero inputs, wrong token, wrong destination, each limit at and one unit over, band edges, duplicate refs | `test/LoanRegistry.test.ts` | S2 |
| Hardhat security | Timelock queue, wait, execute, cancel; guardian powers and non-powers; unpause delay; daily limit across midnight; `recoverSurplus` | `test/LoanRegistry.security.test.ts` | S2 |
| Structural | Many loans, interleaved actions, checked after every step against a TypeScript model | `test/LoanRegistry.structural.test.ts`, `test/helpers/loanModel.ts` | S7 |
| Malicious tokens | Reentrant callback, returns `false`, fee on transfer, blacklist | `contracts/mocks/` | S2 |
| Foundry invariants | One `prop_*` per invariant, three actors including a compromised Safe | `test-fuzz/LoanRegistryInvariants.t.sol` | S7 |
| Medusa | Same `prop_*` | `medusa.json` | S7 |
| Halmos | Exactly-once, owed bound, status machine, collateral timing, daily limit | `test-fuzz/symbolic/LoanRegistrySymbolic.t.sol` | S7 |
| Mutation | L01 to L37 | `scripts/mutate.ts` | S3 to S7 |
| Static | Slither and Aderyn, no high findings | CI | every phase |
| Coverage | 100 percent lines, statements, functions; 95 percent branches | `scripts/check-coverage.ts` | S7 |
| Fork e2e | Real USDC, USDT, Safe, Staking | `test/LoanRegistry.e2e.ts` | S9 |

---

## 12. Open questions (do not block the build)

Placeholders until the partner answers: settlement references are `bytes32` hashes of whatever ID
the partner sends; USDC and USDT are allowed at deploy; GBP or CHF stablecoins are allowed later
through `allowToken`.

1. **Reference format** (system.md D2). Affects only the reconciler.
2. **Which stablecoins the partner settles** (D3). Affects which `allowToken` calls the deploy queues.
3. **Chargebacks** (D4). The design assumes a recorded repayment is final (invariant 4).
4. **Overpayment refunds** (BD8). The contract reverts; the partner must refund the excess in GBP.
5. **Agreement hash and consumer credit** (D5). Legal Bison to confirm publishing the hash is fine.
