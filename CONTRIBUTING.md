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
npx hardhat test                  # unit, structural and mutation suites
forge test                        # fuzzing and invariants
FORK=1 npx hardhat test test/mainnet-fork.e2e.ts   # needs an archive RPC
slither .                         # static analysis
npx ts-node scripts/mutate.ts     # mutation runner
```

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
| 6 | `contracts/test-fuzz/<Name>Invariants.t.sol` | A handler plus `invariant_*` functions for the properties from step 1 |
| 7 | `contracts/` | Run `slither .`, then fix or document every finding |

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
