# First Venture Capital

This repository contains the smart contracts and frontend application for the FVC protocol, a community-governed system for funding SMEs and startups through interest-free grants, revenue-sharing agreements, and equity arrangements on Ethereum.

Token holders vote on which businesses receive funding and earn USDC from the revenues those businesses generate. Governance uses quadratic voting. Compliance is enforced on-chain via KYC whitelisting.

## Contracts

| Contract | Description |
|---|---|
| `FVC.sol` | ERC-20 governance token, 1B supply cap, role-gated mint/burn, UUPS upgradeable |
| `Sale.sol` | Fixed-price token sale accepting USDC/USDT, mints on demand, sends proceeds to treasury |
| `Staking.sol` | Synthetix proportional staking. Stake FVC, earn USDC from SME revenue repayments |
| `Vesting.sol` | Token vesting schedules for team and investor allocations |
| `FVCFaucet.sol` | Testnet-only faucet |

All contracts are in `contracts/src/`. Treasury operations are managed through a 3-of-5 Gnosis Safe multisig.

## Repository Structure

```
contracts/       Solidity contracts (Hardhat)
dapp/            Next.js frontend
packages/        Shared TypeScript types and utilities
subgraph/        TheGraph indexing
docs/            Whitepaper and token sale terms
```

## Development

**Prerequisites:** Node.js 18+, Yarn, [Foundry](https://book.getfoundry.sh/getting-started/installation)

```bash
# Install dependencies
yarn install

# Run the dapp locally
yarn workspace dapp dev

# Compile contracts (Hardhat)
cd contracts && npx hardhat compile

# Run contract tests (Hardhat)
cd contracts && npx hardhat test

# Run invariant / fuzz tests (Foundry)
cd contracts && forge install foundry-rs/forge-std --no-git  # first time only
cd contracts && forge test --match-path 'test-fuzz/*'

# Deploy to Ethereum Sepolia
cd contracts && npx hardhat run scripts/deployment/deploy.ts --network sepolia
```

Hardhat and Foundry share `contracts/src/`. See `contracts/INVARIANTS.md` for properties each contract must satisfy.

### Directory map

```
contracts/
├── src/                    # contracts under test
│   ├── core/FVC.sol
│   ├── sale/Sale.sol
│   ├── vesting/Vesting.sol
│   ├── staking/Staking.sol
│   └── mocks/              # MockStable, MockAggregatorV3, etc.
├── test/                   # Hardhat — write these FIRST (TDD)
│   ├── Vesting.test.ts           # happy paths, integration
│   ├── Vesting.structural.test.ts  # edge cases, mutation killers
│   ├── Sale.test.ts
│   ├── Sale.chainlink.test.ts
│   └── Staking.spec.test.ts
├── test-fuzz/              # Foundry — write AFTER unit tests pass
│   ├── VestingInvariants.t.sol
│   └── SaleInvariants.t.sol
├── INVARIANTS.md           # plain-English rules (write before tests)
└── foundry.toml
```

### New contract (TDD order)

Do this in order. Do not write `src/` until step 2 fails.

| Step | Where | What |
|---|---|---|
| 1 | `contracts/INVARIANTS.md` | List what must always be true (solvency, access, accounting) |
| 2 | `contracts/test/<Name>.test.ts` | Failing Hardhat test for the simplest path (e.g. "user can stake 100 FVC") |
| 3 | `contracts/src/.../<Name>.sol` | Minimal implementation until step 2 passes |
| 4 | `contracts/test/<Name>.test.ts` | More cases: reverts, boundaries, access control |
| 5 | `contracts/test/<Name>.structural.test.ts` | Edge cases unit tests miss (cliff boundary, cap edge, zero amounts) |
| 6 | `contracts/test-fuzz/<Name>Invariants.t.sol` | Handler + `invariant_*` for properties from step 1 |
| 7 | `contracts/` | `slither .` — read findings, fix or document |

**What to test first in `test/`:** one happy path, then all revert paths, then accounting identities (`raised <= cap`, `totalVesting <= balance`, `_totalSupply == sum(balances)`).

**Commands per step:**

```bash
cd contracts
npx hardhat test test/Vesting.test.ts          # step 2–5
npx hardhat test test/Vesting.structural.test.ts
forge test --match-path 'test-fuzz/VestingInvariants.t.sol'  # step 6
slither .                                      # step 7
```

Mutation testing (`Staking.spec.test.ts` pattern, Vertigo) and formal verification are optional. Add them before mainnet deploy, not on day one.

### Existing contract (hardening)

For code already on mainnet: read `src/`, update `INVARIANTS.md`, add `test-fuzz/*Invariants.t.sol`, fuzz until red, fix in `src/`, re-run Hardhat + Foundry. That is retroactive TDD.

### Vesting terms

*Not yet vested* = locked. *Vested, not released* = claimable via `release()`. *Released* = in beneficiary wallet.

## Networks

The protocol is deployed on Ethereum mainnet. Sepolia is used for testing.

## Documentation

- [Whitepaper](./docs/Whitepaper.pdf)
- [Token Sale Terms](./docs/FVC_Token_Sale_Terms_and_Conditions.pdf)
- [GitBook](https://github.com/FVCDigital/fvc-gitbook)
- [Website](https://fvcdigital.com)

## License

MIT — see [LICENSE](./LICENSE).
