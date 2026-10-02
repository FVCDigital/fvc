# Contributing

The contracts in this repository hold real investor allocations. The workflow below exists so that
changes are provably safe before they reach a deployment.

## Setup

```bash
git clone --recurse-submodules git@github.com:FVCDigital/fvc.git
cd fvc
yarn install
cp contracts/.env.example contracts/.env
```

If you cloned without `--recurse-submodules`, run `git submodule update --init --recursive` to fetch
`contracts/lib/forge-std`.

## Running the suites

```bash
cd contracts
npx hardhat compile
npx hardhat test test/*[ct].ts    # unit, structural and mutation-guard suites (offline)
forge test                        # fuzzing and invariants
FORK=1 npx hardhat test test/mainnet-fork.e2e.ts   # needs an archive RPC
slither .                         # static analysis, reads slither.config.json
npx ts-node scripts/mutate.ts     # mutation runner

# Coverage floors, as enforced in CI
COVERAGE=true npx hardhat coverage --testfiles "test/*[ct].ts"
npx ts-node scripts/check-coverage.ts

# Nightly and weekly campaigns, locally
FOUNDRY_PROFILE=deep forge test
FOUNDRY_DYNAMIC_TEST_LINKING=false medusa fuzz --timeout 600
FOUNDRY_DYNAMIC_TEST_LINKING=false halmos --match-contract 'Symbolic$'
```

Medusa (`medusa.json`) fuzzes the same handlers as Foundry and checks their `prop_*` functions, so a
property only has to be written once. Halmos needs Foundry's dynamic test linking turned off because
it cannot execute the `deployCode` cheatcode that linking emits.

## What CI enforces

| Workflow | Trigger | Blocks on |
|---|---|---|
| `contracts` | Every push and pull request | Test failure, coverage below a floor in `scripts/check-coverage.ts`, any high Slither finding |
| `nightly-fuzz` | 02:00 UTC daily | Any invariant broken by the deep Foundry campaign or by Medusa |
| `weekly-security` | 03:00 UTC Sundays | Mutation score below 80%, a stale mutant, or a failing `check_*` in a `*Symbolic` contract |

Coverage floors only go up. If a change lowers coverage, add tests; do not lower the floor.
Properties Halmos cannot finish yet go in a `*SymbolicSlow` contract, which runs but never blocks.

Hardhat and Foundry compile the same sources. Hardhat owns `cache/` and `test/`, Foundry owns
`cache_forge/` and `test-fuzz/`. Do not point either tool at the other's directories.

## Adding a contract

Write the properties first, then the failing test, then the implementation. Do not create anything
in `src/` until step 2 fails for the right reason.

| Step | Where | What |
|---|---|---|
| 1 | `contracts/INVARIANTS.md` | State what must always be true: solvency, access control, accounting identities |
| 2 | `contracts/test/<Name>.test.ts` | One failing test for the simplest path, for example "user can stake 100 FVC" |
| 3 | `contracts/src/.../<Name>.sol` | Minimal implementation until step 2 passes |
| 4 | `contracts/test/<Name>.test.ts` | Revert paths, boundaries, access control |
| 5 | `contracts/test/<Name>.structural.test.ts` | Edge cases unit tests miss: cliff boundaries, cap edges, zero amounts |
| 6 | `contracts/test-fuzz/<Name>Invariants.t.sol` | A handler with a no-argument constructor and `prop_*` functions for the properties from step 1, plus `invariant_*` wrappers that assert them |
| 7 | `contracts/medusa.json` | Add the handler to `targetContracts` |
| 8 | `contracts/scripts/mutate.ts` | Labelled mutants for every guard; each must be killed |
| 9 | `contracts/scripts/check-coverage.ts` | A coverage floor for the new contract |
| 10 | `contracts/` | Run `slither .`, then fix or document every finding |

Test ordering within a suite: one happy path, then every revert path, then the accounting identities
(`raised <= cap`, `totalVesting <= balance`, `totalSupply == sum of balances`).

## Changing a contract that is already deployed

Mainnet contracts are not upgradeable, so source changes do not change live behaviour. The process
is still worth following, because it produces the record of what is fixed and what is not.

1. Read the deployed source and update `INVARIANTS.md` with the property you believe is broken.
2. Add or extend the Foundry invariant suite until the fuzzer reproduces the violation.
3. Fix the source and confirm both suites are green.
4. Record the finding in the table at the bottom of `INVARIANTS.md`, including whether the fix
   reached mainnet. Do not delete rows for bugs that are still live.

## Mutation guards

Mutation tests are labelled per contract, for example `S01` to `S14` in `Staking.spec.test.ts` and
`F01` to `F08` in `FVC.structural.test.ts`. Each label names the mutation it kills. If you add a
branch to a contract, add the matching guard and extend the label list in the file header.

## Conventions

- Solidity 0.8.24. Keep imports on OpenZeppelin where an audited implementation exists.
- No em dashes or en dashes in comments, commit messages, documentation or user-facing strings. Use a
  colon, semicolon, comma or a second sentence.
- Comments explain constraints and intent, not what the next line does.
- Deployment scripts print the addresses and the follow-up Safe transactions they require. Keep that
  output accurate, since it is what operations work from.
- Never commit a private key, RPC key or `.env` file. RPC endpoints come from the environment only.

## Pull requests

State what changed, which suites you ran, and any invariant or Slither finding you chose not to fix
and why. Deployment changes need the Safe transaction plan in the description.
