# Security

## Reporting a vulnerability

Email `igli@fvcdigital.com` with enough detail to reproduce the issue. Do not open a public issue for
anything that affects funds. We aim to acknowledge within 48 hours and will tell you what we intend
to do and when.

If the finding affects live investor allocations, say so in the subject line. The treasury Safe can
deactivate the sale contracts immediately, which is the fastest mitigation available for the sale
path.

## Scope

In scope are the contracts under `contracts/src` and the deployed addresses listed in the
[README](./README.md). The dapp under `dapp/` is in scope for issues that put user funds or keys at
risk, not for styling or availability.

Out of scope: the testnet faucet, the mock contracts under `src/mocks`, anything in
`contracts/lib` (vendored forge-std), and findings that require a compromised treasury signer.

## Current posture

| Area | Status |
|---|---|
| External audit | Hashlock engagement in progress. No final report published yet. |
| Unit and structural tests | 297 Hardhat tests on a clean checkout |
| Fuzzing and invariants | Foundry suites for Vesting and Sale, 256 invariant runs at depth 50 |
| Mutation testing | Labelled guards per contract, runner at `contracts/scripts/mutate.ts` |
| Static analysis | Slither, run manually before deployments |
| Formal verification | Not done |
| Bug bounty | Not open yet |

Documented properties live in [contracts/INVARIANTS.md](./contracts/INVARIANTS.md), including the
table of violations the fuzzer found and whether each fix reached mainnet.

## Trust assumptions

Investors should read these before treating the protocol as trustless.

- The treasury Safe is a 2 of 4 multisig at `0xE20c89da2138951655DbbbE6E6db01fe561EBe82`. It holds
  FVC's `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` and `BURNER_ROLE`, and owns the Sale and Staking
  contracts. Two compromised signers can mint up to the 1,000,000,000 token cap.
- The Vesting contract is owned by the primary Sale contract so that purchases can mint and create a
  schedule atomically. Vesting administration therefore runs through Sale's owner functions.
- The Sale owner can change price, cap, accepted tokens, oracle configuration and per-investor terms
  at any time, and can mint OTC allocations that do not increment the recorded raise.
- ETH pricing depends on the Chainlink ETH/USD feed. If the answer is older than one hour or
  non-positive, the contract falls back to an owner-set rate, which is a trusted input.
- Mainnet contracts are not upgradeable. Fixing a contract means deploying a replacement and
  migrating, not patching in place.
- Governance is off-chain. There is no on-chain vote, timelock, or on-chain KYC registry today.

## Known issues

These are tracked openly rather than left for a reviewer to find.

- `Sale.setCap` accepts a cap below `raised`, which breaks the `raised <= cap` property. Found by the
  Foundry fuzzer. Operationally avoided; fixed in source for the next deployment.
- Vesting v1 on mainnet is immutable and contains the accounting gaps listed in INVARIANTS.md:
  `modifyVestingSchedule` without a balance check, partial revoke stranding vested tokens, and a
  view underflow before `startTime`. The release path works correctly for existing schedules. A v2
  with a corrected admin split is planned before the first cliff unlocks in March 2027.
- The allowlist sale at `0xdf95824ae269c62427a5925231b970aa43d709d1` cannot create vesting schedules,
  because Vesting is owned by the primary Sale. Its vesting purchases revert. It has raised nothing
  and is not in use.

## Operational practice

- Mainnet parameter changes are executed as Safe transactions. Deployment scripts print the exact
  calldata, and `contracts/scripts/export-safe-batch.ts` produces the batch file.
- Deployer keys are used for contract creation only. Ownership and roles are transferred to the Safe
  as part of deployment, and that transfer is verified on-chain afterwards.
- RPC and API keys come from the environment. Nothing in this repository should contain a credential.
