# First Venture Capital (FVC)

FVC is a funding protocol for small and medium-sized businesses. Capital is raised on-chain in
stablecoins, deployed into vetted companies under interest-free revenue-share agreements, and
repayments come back to the protocol as USDC to be distributed to stakers.

This repository holds the Solidity contracts and the investor dapp. The token, sale and vesting
contracts have been live on Ethereum mainnet since March 2026 and hold real investor allocations.

| | |
|---|---|
| Website | [fvcdigital.com](https://fvcdigital.com) |
| Whitepaper | [docs/Whitepaper.pdf](./docs/Whitepaper.pdf) |
| Sale terms | [docs/FVC_Token_Sale_Terms_and_Conditions.pdf](./docs/FVC_Token_Sale_Terms_and_Conditions.pdf) |
| Contract properties | [contracts/INVARIANTS.md](./contracts/INVARIANTS.md) |
| Security posture | [SECURITY.md](./SECURITY.md) |
| Legal entity | FVC Asset Group Ltd, British Virgin Islands |

## Deployed contracts

Ethereum mainnet. Every address below is verified on Etherscan.

| Contract | Address | Role |
|---|---|---|
| FVC token | [`0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556`](https://etherscan.io/address/0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556) | ERC-20, 1,000,000,000 hard cap |
| Sale | [`0x0E99482aaA074C72756b78eDbdCA61E438729c54`](https://etherscan.io/address/0x0E99482aaA074C72756b78eDbdCA61E438729c54) | Primary sale, all purchases vest |
| Vesting | [`0x24263Dce127Ad06cC272897629d6688Ec54df389`](https://etherscan.io/address/0x24263Dce127Ad06cC272897629d6688Ec54df389) | Holds investor allocations |
| Sale (no vesting) | [`0xc4b6d70Fd384CA3CAD335e45a041717b56622737`](https://etherscan.io/address/0xc4b6d70Fd384CA3CAD335e45a041717b56622737) | Immediate delivery for specific OTC buyers |
| Sale (allowlist) | [`0xdf95824ae269c62427a5925231b970aa43d709d1`](https://etherscan.io/address/0xdf95824ae269c62427a5925231b970aa43d709d1) | Per-investor terms, currently unusable (see below) |
| Treasury | [`0xE20c89da2138951655DbbbE6E6db01fe561EBe82`](https://etherscan.io/address/0xE20c89da2138951655DbbbE6E6db01fe561EBe82) | Gnosis Safe, 2 of 4 signers, owns the contracts |

Staking is written and tested but not yet deployed to mainnet. It goes live when the first SME
repayments are ready to distribute.

On-chain state as of 19 September 2026: 1,880,245 FVC minted against the 1,000,000,000 cap,
1,879,815 FVC held in vesting schedules, and roughly 26,400 USD accepted across the sale contracts
at 0.03 USD per FVC.

## Contracts

| Source | What it does |
|---|---|
| [`src/core/FVC.sol`](./contracts/src/core/FVC.sol) | ERC-20 token. Hard cap of 1,000,000,000 enforced by `ERC20Capped`. Mint and burn are gated by `MINTER_ROLE` and `BURNER_ROLE`. Not upgradeable and has no pause, blacklist, or transfer hook. |
| [`src/sale/Sale.sol`](./contracts/src/sale/Sale.sol) | Fixed-price sale in USDC, USDT and ETH. ETH is priced from a Chainlink ETH/USD feed with a one-hour staleness check and an owner-set fallback rate. Proceeds are forwarded to the treasury in the same transaction. Supports per-investor terms (custom rate, spend limit, custom vesting) and owner-only OTC minting. |
| [`src/vesting/Vesting.sol`](./contracts/src/vesting/Vesting.sol) | Any number of independent schedules per beneficiary, each with its own amount, cliff and linear duration. Beneficiaries call `release(scheduleId)`. The owner can modify or revoke a schedule, which refunds the unvested remainder. |
| [`src/staking/Staking.sol`](./contracts/src/staking/Staking.sol) | Synthetix `StakingRewards` pattern. Stake FVC, earn USDC over a seven-day reward period funded by `notifyRewardAmount`. `recoverERC20` cannot touch the staking or rewards token. |
| [`src/testnet/FVCFaucet.sol`](./contracts/src/testnet/FVCFaucet.sol) | Testnet faucet. Never deployed to mainnet. |

Solidity 0.8.24 with OpenZeppelin libraries. Hardhat runs unit tests and deployments, Foundry runs
fuzzing and invariants.

### How a purchase works

1. An investor calls `buy` with USDC or USDT, or `buyWithETH` with native ETH.
2. Sale mints FVC. On the primary sale the vesting threshold is zero, so every purchase is minted to
   the Vesting contract and a schedule is created in the same transaction: a 365-day cliff followed
   by a 730-day linear vest, unless the investor has negotiated terms on the allowlist.
3. Stablecoins and ETH are forwarded to the treasury Safe immediately. The Sale contract is not
   designed to hold funds between transactions.
4. The Safe deploys capital into businesses off-chain. Repayments return as USDC.
5. Once Staking is live, repayments are pushed in through `notifyRewardAmount` and accrue to stakers
   over the reward period.

### Ownership and administrative powers

Read this section before assuming anything about decentralisation.

- The treasury Safe (2 of 4) owns FVC's admin role and the Sale and Staking contracts.
- Vesting is owned by the primary Sale contract, which is what lets a purchase mint and create a
  schedule atomically. Schedule changes therefore have to go through the Sale owner functions.
- The Sale owner can change price, cap, accepted tokens, oracle settings and investor terms, and can
  mint OTC allocations outside the recorded raise.
- Governance is off-chain today. The quadratic voting model in the whitepaper is a roadmap item, and
  no governance contract is deployed.
- Investor eligibility (KYC and AML) is checked off-chain during onboarding and enforced at purchase
  time through the owner-managed allowlist in Sale. There is no on-chain KYC registry.

### Known operational issues

- The allowlist sale at `0xdf95...709d1` routes to Vesting, but Vesting is owned by the primary Sale,
  so its vesting purchases revert. It has raised nothing and is not in use. Negotiated allocations
  are handled through OTC minting on the primary contracts instead.
- `Sale.setCap` does not require the new cap to be at or above `raised`, so lowering the cap below
  the amount already raised breaks the `raised <= cap` property. Found by the Foundry fuzzer and
  recorded in [INVARIANTS.md](./contracts/INVARIANTS.md).
- Vesting v1 on mainnet is immutable and carries the accounting gaps listed in INVARIANTS.md. Release
  works correctly for existing schedules. A corrected v2 with a proper admin split is planned before
  the first cliff unlocks in March 2027.

## Repository layout

```
contracts/          Solidity sources, Hardhat and Foundry suites, deployment scripts
  src/              Contracts under test
  test/             Hardhat unit, structural and mutation tests
  test-fuzz/        Foundry invariant suites
  scripts/          Deployment and treasury operations
  INVARIANTS.md     Properties every contract must satisfy
dapp/               Next.js investor application (purchase, vesting dashboard, staking)
packages/shared/    Workspace for shared TypeScript output, generated by typechain
subgraph/           The Graph schema and manifest
docs/               Whitepaper and token sale terms, with LaTeX sources
scripts/            Repository-level helper scripts
```

Generated output (Hardhat artifacts, typechain types, Foundry `out/`) is not committed. Run
`npx hardhat compile` after cloning if you need the types.

## Getting started

Prerequisites: Node.js 20 or newer, Yarn, and [Foundry](https://book.getfoundry.sh/getting-started/installation).

```bash
git clone --recurse-submodules git@github.com:FVCDigital/fvc.git
cd fvc
yarn install
```

The dapp reads contract addresses from environment variables. Copy `contracts/.env.example` and set
the values for the network you are targeting.

```bash
# Frontend
yarn workspace dapp dev

# Contracts
cd contracts
npx hardhat compile
npx hardhat test                    # unit, structural and mutation suites
forge test                          # fuzzing and invariants
npx hardhat run scripts/deploy-sepolia.ts --network sepolia
```

Hardhat and Foundry compile the same sources in `contracts/src`. Hardhat owns `cache/` and `test/`,
Foundry owns `cache_forge/` and `test-fuzz/`, which is why `foundry.toml` overrides both paths.

## Tests

297 Hardhat tests and two Foundry invariant suites pass on a clean checkout. The suites are split by
intent:

| Suite | Purpose |
|---|---|
| `test/*.test.ts` | Happy paths, revert paths and integration behaviour |
| `test/*.structural.test.ts` | Edge cases that unit tests miss, such as exact cliff and cap boundaries |
| `test/*.spec.test.ts` | Mutation guards, each labelled and mapped to the mutation it kills |
| `test-fuzz/*Invariants.t.sol` | Handler-driven invariants, 256 runs at depth 50 |
| `test/mainnet-fork.e2e.ts` | End-to-end purchase against forked mainnet state, needs an RPC URL |

Invariant violations found this way are logged in `contracts/INVARIANTS.md` together with whether
the fix reached mainnet. That table is the honest record of what is fixed in source and what is
still live in Vesting v1.

## Contributing

Development workflow, test-first ordering and the checklist for adding a contract are in
[CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT. See [LICENSE](./LICENSE).
