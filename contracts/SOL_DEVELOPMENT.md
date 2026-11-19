# Solidity development guide (TDD, security first)

This is the day-to-day playbook for writing Solidity in this repo. Security is the priority, not
speed. Follow it for every new contract (including LoanRegistry) and every change to code that can
move funds.

It combines:

- **Trail of Bits** [Building Secure Contracts](https://secure-contracts.com/) workflow: properties
  first, Slither on every change, fuzzing, visual printers, assume automation misses some classes
  of bug.
- **OpenZeppelin** practice: use battle-tested libraries, TDD / shift-left testing, negative and
  auth tests, coverage that only goes up, audits as necessary but not sufficient.
- **This repo's arsenal**: Hardhat, Foundry, Medusa, Halmos, Slither, mutation testing, coverage
  floors, mainnet-fork e2e, CI (`contracts`, `nightly-fuzz`, `weekly-security`).

Shorter setup and command list: [CONTRIBUTING.md](../CONTRIBUTING.md). Properties:
[INVARIANTS.md](./INVARIANTS.md). Incident and trust model: [SECURITY.md](../SECURITY.md).

---

## Your arsenal (what each tool is for)

| Tool | Job | When you run it |
|---|---|---|
| Hardhat + Chai | Unit, structural, mutation-guard tests (TypeScript) | Every edit; CI on every PR |
| Foundry `forge test` | Invariant / fuzz handlers (`prop_*`, `invariant_*`) | Every edit once a handler exists; CI |
| Medusa | Second fuzzer on the same `prop_*` properties | Locally before PR; nightly CI |
| Halmos | Symbolic checks on a subset of properties | Weekly CI; locally on accounting-critical code |
| Slither | Static analysis (reentrancy, access, bad patterns) | Every edit; CI blocks on high |
| Slither printers | Inheritance, function summary, vars-and-auth review | After first implementation, before PR |
| solidity-coverage + `check-coverage.ts` | Line/branch floors that only rise | Before PR; CI |
| `scripts/mutate.ts` | Kill labelled mutants (guards must earn their keep) | Before PR that adds branches; weekly CI |
| Mainnet fork e2e | Real state / Safe / deployed addresses | Before any deployment or migration |
| OpenZeppelin Contracts | Audited building blocks (AccessControl, Pausable, ERC20, SafeERC20) | Prefer over hand-rolled primitives |
| Hashlock | External audit | After internal pipeline is green; before claiming "audited" |

Do not invent a parallel stack. If a step below names a tool, use the one in this table.

---

## Golden rules

1. **Properties before code.** If you cannot write the invariant in plain English, you do not
   understand the contract yet. Do not open `src/`.
2. **Red, green, refactor.** One failing test for the smallest path, then the smallest code that
   makes it pass, then clean up. Never jump to a full contract.
3. **Negative tests are security tests.** For every privilege and every money move, prove the wrong
   caller and the bad input revert.
4. **Coverage is not security.** 100% coverage with only happy paths is worthless. OpenZeppelin's
   point: test the absence of bad behaviour.
5. **Automation is not enough.** Trail of Bits lists what tools miss (mempool privacy, front-running,
   bad crypto, messy external DeFi). Write those down in the threat notes for the contract.
6. **Mainnet is immutable.** A green suite on a new file does not fix live bytecode. Record live bugs
   in the INVARIANTS.md table and plan a migration if needed.
7. **No "audited" claim** until Hashlock's final report is published on `/security`.

---

## Phase 0: Threat model (before any test)

Do this on paper or in the contract's design doc (example: [LOAN_REGISTRY.md](./LOAN_REGISTRY.md)).

Checklist:

- [ ] Who can lose money, and how?
- [ ] Who are the privileged roles (Safe, originator, recorder, oracle, pause)?
- [ ] What must never happen (double credit, over-repay, wrong token, paused writes)?
- [ ] What external contracts do you trust (stablecoins, oracles, Staking)?
- [ ] What can automation miss here (timing of fiat settlement, chargebacks, front-run of
      recorder txs)?
- [ ] Upgradeability? Prefer **no**. This repo's production pattern is immutable + Safe admin.

Gate: you can list at least five invariants before writing Solidity.

---

## Phase 1: Spec the properties (TDD step 0)

| Step | Action | Done when |
|---|---|---|
| 1.1 | Add or extend a section in `INVARIANTS.md` | Numbered rules for solvency, access, lifecycle |
| 1.2 | Keep the long design in a dedicated doc if needed | Roles, data model, open product questions listed |
| 1.3 | Name mutation labels you will need later (`L01`, `L02`, ...) | Every critical `require` / guard has a future label |

LoanRegistry example: properties 1 to 20, C1 to C6 and S1 to S12 are in `INVARIANTS.md`, and
mutation labels L01 to L37 are in `LOAN_REGISTRY.md` section 10 (frozen in S1). Do not re-derive
them; implement against them.

Gate: a reviewer can attack the design from the invariants alone.

---

## Phase 2: First failing Hardhat test (red)

Per CONTRIBUTING: **do not create anything in `src/` until this fails for the right reason.**

| Step | Action | Command / file |
|---|---|---|
| 2.1 | Create `test/<Name>.test.ts` | One happy path only |
| 2.2 | Run it | `npx hardhat test test/<Name>.test.ts` |
| 2.3 | Confirm failure mode | Missing artifact, or revert for "not implemented", not a flaky assert |

LoanRegistry: the whole suite is written first in phase S2 and fails with `HH700` (no artifact).
That is correct. Phase S3 adds the first code.

Gate: failure is intentional and readable.

---

## Phase 3: Minimal implementation (green)

| Step | Action | Notes |
|---|---|---|
| 3.1 | Add `src/.../<Name>.sol` | Smallest code that passes **only** the current test |
| 3.2 | Prefer OZ | `AccessControl`, `Pausable`, `ReentrancyGuard`, `SafeERC20` as needed |
| 3.3 | Solidity `0.8.24` | Match the rest of the repo |
| 3.4 | Re-run the unit test | Must pass |
| 3.5 | Run Slither | `slither .` ; fix or document every high |

Anti-patterns:

- Do not implement the full API in one go.
- Do not skip events on state that moves money or changes status.
- Do not put personal data on-chain.

Gate: one green happy path; Slither high is clean or triage-documented.

---

## Phase 4: Expand Hardhat (security testing)

Add tests in this order (OpenZeppelin readiness style):

1. **Happy paths** for each user-visible action.
2. **Negative / auth**: wrong role, paused, zero amounts, bad token, duplicate refs.
3. **Boundaries**: exact cap, one wei over, first and last status transition.
4. **Accounting identities**: totals reconcile; balances match ghost math.
5. **Structural suite** `test/<Name>.structural.test.ts` for edges unit tests miss.
6. **Mutation guards** labelled in the file header (`L01` ...); each kills one deliberate mutant.

Commands:

```bash
cd contracts
npx hardhat test test/<Name>*.ts
COVERAGE=true npx hardhat coverage --testfiles "test/*[ct].ts"
npx ts-node scripts/check-coverage.ts
```

Gate: coverage floor raised in `scripts/check-coverage.ts` for the new contract; no lowered floors.

---

## Phase 5: Property-based pipeline (Foundry + Medusa + Halmos)

Trail of Bits rule: document properties, then let generators attack them. In this repo the same
`prop_*` functions feed Foundry and Medusa.

| Step | Action | File / command |
|---|---|---|
| 5.1 | Handler with no-arg constructor | `test-fuzz/<Name>Invariants.t.sol` |
| 5.2 | One `prop_*` per invariant (or a tight group) | Assert, do not log-and-ignore |
| 5.3 | `invariant_*` wrappers calling `prop_*` | Foundry entrypoints |
| 5.4 | Register handler in `medusa.json` | `targetContracts` |
| 5.5 | Local fuzz | `forge test` then `FOUNDRY_PROFILE=deep forge test` |
| 5.6 | Medusa | `FOUNDRY_DYNAMIC_TEST_LINKING=false medusa fuzz --timeout 600` |
| 5.7 | Halmos on the hard accounting bits | `FOUNDRY_DYNAMIC_TEST_LINKING=false halmos --match-contract 'Symbolic$'` |
| 5.8 | Slow or unfinished symbolic checks | Put in `*SymbolicSlow` so they never block wrongly |

If the fuzzer finds a break: fix source, add a Hardhat regression if useful, log the row in
`INVARIANTS.md` under "Bugs found via invariants".

Gate: deep Foundry and Medusa clean on your machine before you open the PR.

---

## Phase 6: Static review pass (Slither printers)

After the API is stable, run a human review with Trail of Bits printers:

```bash
cd contracts
slither . --print inheritance-graph
slither . --print function-summary
slither . --print vars-and-auth
```

Checklist:

- [ ] Inheritance is shallow and intentional
- [ ] Every money or admin function has the role you expect
- [ ] No surprising `public` / `external` writers
- [ ] Token integration: only allowlisted ERC20s; assume fee-on-transfer and weird return values
      unless you have proven otherwise (use `SafeERC20`)

Gate: you can explain every privileged write from the function-summary output.

---

## Phase 7: Mutation testing

| Step | Action |
|---|---|
| 7.1 | Add labelled mutants for each new guard to `scripts/mutate.ts` |
| 7.2 | Add Hardhat tests that fail if the guard is removed |
| 7.3 | Run `npx ts-node scripts/mutate.ts` |
| 7.4 | Score must stay at or above **80%** (weekly CI) |

Gate: every new `require` / access check has a killer test.

---

## Phase 8: Pre-PR security checklist

Run from `contracts/`:

```bash
npx hardhat compile
npx hardhat test test/*[ct].ts
forge test
FOUNDRY_PROFILE=deep forge test
FOUNDRY_DYNAMIC_TEST_LINKING=false medusa fuzz --timeout 600
slither .
COVERAGE=true npx hardhat coverage --testfiles "test/*[ct].ts"
npx ts-node scripts/check-coverage.ts
npx ts-node scripts/mutate.ts
```

PR description must include:

- [ ] What changed and which invariants it touches
- [ ] Commands you ran and results
- [ ] Any Slither finding left open, with reason
- [ ] Whether mainnet behaviour changes (usually: no, until a new deploy)

CI that must stay green: `contracts`. Nightly/weekly will catch deeper fuzz and mutants after merge;
do not rely on that as your first line.

---

## Phase 9: Deployment readiness (only when product says go)

Immutable deploy path used here:

| Step | Action |
|---|---|
| 9.1 | Freeze the bytecode you intend to ship (tag or commit SHA) |
| 9.2 | Fork e2e against real addresses | `FORK=1 npx hardhat test test/mainnet-fork.e2e.ts` |
| 9.3 | Deployment script prints addresses **and** required Safe txs | Operators work from that output |
| 9.4 | Deploy to testnet; verify on explorer |
| 9.5 | Dry-run Safe batches on a fork |
| 9.6 | Mainnet deploy; transfer roles to the treasury Safe |
| 9.7 | Post-deploy: watch events; SECURITY.md contact path ready |
| 9.8 | Hashlock: scope freeze, remediation cycle, publish report only when final |

Never deploy a contract that failed Phase 8. Never call a report "audited" from a draft.

---

## Changing code that is already on mainnet

1. Re-read deployed source (not only `src/`).
2. Add or tighten the property in `INVARIANTS.md`.
3. Extend Foundry until the fuzzer shows the break (if it is a real invariant bug).
4. Fix `src/`; keep suites green.
5. Log the bug table row: fixed in source? on mainnet?
6. Plan migration / Vesting-v2 style cutover if users depend on the live bug's absence.

---

## LoanRegistry build order

Follow phases S2 to S12 in [`docs/specs/loan-registry-plan.md`](../docs/specs/loan-registry-plan.md)
section 6, one PR per phase, each started with the phase prompt in section 10 of that file. The
security controls (S3) are built before any money feature, so every money path is written behind
them.

Placeholders until the partner answers: `MockStable` as USDC, `bytes32` settlement refs, the Safe
as every role. Do not wait on product answers; the accounting rules are frozen.

---

## Daily rhythm (keep this short)

```text
write/adjust invariant  ->  red test  ->  minimal .sol  ->  hardhat green
    ->  slither  ->  more negative tests  ->  forge/medusa when handler exists
    ->  coverage + mutants before PR
```

If you skip a box, you are choosing speed over security. In this repo that is the wrong trade.

---

## References (external)

- Trail of Bits, Building Secure Contracts (workflow, properties, Slither, fuzzing):
  https://secure-contracts.com/
- OpenZeppelin Contracts (battle-tested primitives) and engineering guidelines:
  https://github.com/OpenZeppelin/openzeppelin-contracts
- OpenZeppelin secure development / readiness (TDD, negative tests, shift-left):
  https://www.openzeppelin.com/readiness-guide

Internal:

- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [INVARIANTS.md](./INVARIANTS.md)
- [LOAN_REGISTRY.md](./LOAN_REGISTRY.md)
- [SECURITY.md](../SECURITY.md)
