# LoanRegistry: design and invariants

Status: specified, not implemented. Nothing exists in `src/` yet. Per [CONTRIBUTING.md](../CONTRIBUTING.md),
the properties below come first, then the failing tests, then the contract.

---

## What it is

LoanRegistry is the on-chain record of every SME financing agreement FVC signs and every repayment
that comes back. It connects three things that today live in separate places:

1. The **legal agreement**, signed off-chain under English or Swiss law.
2. The **fiat repayment**, made by the SME through the on/off-ramp partner.
3. The **stablecoin settlement**, which lands in FVC's treasury and eventually reaches stakers.

The SME never touches crypto. It signs a normal agreement and repays by direct debit or bank transfer
in GBP or CHF. The ramp partner converts the payment to a GBP or CHF stablecoin and settles it to the
treasury with a payment reference. LoanRegistry records that settlement against the right loan, so
anyone can check what was lent, what was repaid, and what is outstanding, without seeing who the SME is.

## What it is not

- **Not a lending pool.** It does not decide who gets funded. Credit decisions happen off-chain.
- **Not a payment processor.** Card, direct debit and bank transfers are handled by the ramp partner.
- **Not a store of personal data.** No names, company numbers or bank details go on-chain.
- **Not atomic with the fiat leg.** Card and bank payments settle over days and can be reversed.
  The contract only records stablecoin that has actually arrived.

---

## End-to-end flow

```
SME signs agreement (off-chain, Legal Bison template)
        |
        v
Safe calls createLoan(agreementHash, smeRef, token, principal, repaymentCap)
        |
        v
Safe disburses: stablecoin -> ramp partner -> GBP/CHF to the SME's bank   (off-ramp)
        |
        v
SME repays in fiat with its unique reference (direct debit, transfer, card as fallback)
        |
        v
Ramp partner converts and settles stablecoin to the Safe, quoting the reference
        |
        v
Reconciler matches the settlement to a loan and proposes a Safe transaction
        |
        v
Safe executes recordRepayment(loanId, amount, settlementRef)
   which pulls the stablecoin into the registry, so the record and the money cannot diverge
        |
        v
Registry forwards repayments to Staking for distribution (see open question 3)
```

### Why repayments pull funds instead of just logging them

A pure log ("the operator says 1,000 GBP arrived") cannot be checked on-chain. If `recordRepayment`
transfers the stablecoin into the registry in the same transaction, then every recorded repayment is
backed by tokens the contract actually holds. That turns "all stablecoins accounted for" from a promise
into an invariant the fuzzer can check.

---

## Data model (draft)

```solidity
enum Status { Active, Repaid, Defaulted, WrittenOff }

struct Loan {
    bytes32 agreementHash;  // keccak256 of the signed agreement PDF
    bytes32 smeRef;         // keccak256(internal SME id, salt); never the raw id
    address token;          // GBP or CHF stablecoin the loan is denominated in
    uint256 principal;      // amount disbursed
    uint256 repaymentCap;   // total the SME owes under the revenue-share agreement
    uint256 repaid;         // total recorded so far
    uint64  createdAt;
    Status  status;
}

mapping(uint256 => Loan) public loans;
mapping(bytes32 => bool) public settlementUsed;   // ramp partner's payment reference, hashed
mapping(address => bool) public allowedToken;
mapping(address => uint256) public totalRepaid;   // per token, across all loans
mapping(address => uint256) public totalForwarded; // per token, sent on for distribution
```

FVC's agreements are interest-free revenue-share, so the amount due each month varies with the SME's
revenue. The contract does not model a fixed instalment schedule. It tracks the **repayment cap** (the
total the SME has agreed to pay back) and how much of it has been met. The revenue-share percentage and
reporting live in the legal agreement.

### Roles

| Role | Holder | Can do |
|---|---|---|
| Admin | Treasury Safe (2 of 4) | Allow tokens, grant roles, pause, mark default, write off |
| Originator | Treasury Safe | Create loans |
| Recorder | Treasury Safe, later a reconciler with a spend-limited allowance | Record repayments (must supply the tokens) |
| Distributor | Treasury Safe | Forward repaid tokens to Staking |

Because recording a repayment pulls real tokens, a compromised recorder cannot invent repayments. The
most it can do is attribute a real payment to the wrong loan, which the settlement reference and the
off-chain reconciliation report make detectable.

### Functions (draft)

| Function | Who | Effect |
|---|---|---|
| `createLoan(agreementHash, smeRef, token, principal, repaymentCap)` | Originator | New loan in `Active` |
| `recordRepayment(loanId, amount, settlementRef)` | Recorder | Pulls `amount` of the loan's token, credits the loan, marks the reference used, moves to `Repaid` when the cap is met |
| `markDefault(loanId)` / `cure(loanId)` | Admin | `Active` to `Defaulted` and back |
| `writeOff(loanId)` | Admin | `Defaulted` to `WrittenOff` (terminal) |
| `forward(token, amount, to)` | Distributor | Sends repaid tokens to the distribution contract |
| `setAllowedToken(token, allowed)` | Admin | Manage accepted stablecoins |
| `pause()` / `unpause()` | Admin | Halts state changes; views keep working |

---

## Invariants

Numbered the same way as [INVARIANTS.md](./INVARIANTS.md). These are the rules the Foundry handler,
Medusa and Halmos will check once the contract exists.

### Repayment accounting

1. **Exactly-once crediting.** A `settlementRef` can be used at most once. Recording the same
   settlement twice reverts.
2. **Never over-repaid.** `loan.repaid <= loan.repaymentCap` for every loan. A repayment that would
   exceed the cap reverts; overpayments are refunded off-chain.
3. **Outstanding reconciles.** `outstanding(loan) == repaymentCap - repaid` and never underflows.
4. **Repaid only grows.** `loan.repaid` never decreases.
5. **Per-token totals reconcile.** For every token, `totalRepaid[token] == sum of loan.repaid` over all
   loans in that token.
6. **Every recorded repayment is backed.** For every token,
   `token.balanceOf(registry) >= totalRepaid[token] - totalForwarded[token]`.
7. **Nothing created or destroyed.** Tokens pulled in == tokens forwarded + tokens held (ghost
   accounting in the handler, as in the Vesting suite).
8. **Forwarding is bounded.** `totalForwarded[token] <= totalRepaid[token]`.

### Currency

9. A repayment is only accepted in the loan's own `token`.
10. `createLoan` only accepts tokens where `allowedToken[token]` is true. Disallowing a token later
    does not block repayments on existing loans in that token.
11. No conversion happens on-chain. A GBP loan is repaid in GBP stablecoin and reported in GBP.

### Lifecycle

12. Allowed status changes are exactly: `Active -> Repaid` (automatic, when the cap is met),
    `Active -> Defaulted`, `Defaulted -> Active` (cure), `Defaulted -> WrittenOff`.
    `Repaid` and `WrittenOff` are terminal.
13. Repayments are accepted on `Active` and `Defaulted` loans and rejected on `Repaid` and `WrittenOff`.
14. A loan reaches `Repaid` if and only if `repaid == repaymentCap`.
15. `agreementHash`, `smeRef`, `token`, `principal` and `repaymentCap` never change after creation.
    Amending an agreement means creating a new loan that references the old one in an event.

### Access and safety

16. Only the Originator creates loans, only the Recorder records repayments, only the Distributor forwards.
17. The Recorder cannot change loan terms or status, except the automatic move to `Repaid`.
18. While paused, no state-changing function succeeds and every view still returns.
19. Views never revert on any reachable state (dashboard property, as Vesting invariant 9).

### Privacy

20. No function takes or emits personal data. `smeRef` is a salted hash, so two loans to the same SME
    cannot be linked on-chain unless FVC reuses the salt on purpose.

---

## How it will be tested

The contract will be built inside the CI security system rather than checked after the fact.

| Layer | What it covers | Where |
|---|---|---|
| Hardhat unit and structural tests | Happy paths, every revert, cap and status boundaries | `test/LoanRegistry.test.ts`, `test/LoanRegistry.structural.test.ts` |
| Foundry invariants | Invariants 1 to 19 with a handler that creates loans, records repayments (including duplicate references), defaults, cures, writes off, forwards and pauses | `test-fuzz/LoanRegistryInvariants.t.sol` |
| Medusa | The same `prop_*` functions, on a different fuzzing engine, nightly | `medusa.json` target list |
| Halmos | Exactly-once crediting, cap never exceeded, status machine | `test-fuzz/symbolic/LoanRegistrySymbolic.t.sol` |
| Mutation testing | Labelled guards `L01` onward: remove the reference check, the cap check, the token check, the status check | `scripts/mutate.ts` |
| Slither | Fails the build on any high finding | CI |
| Coverage floor | Added to `scripts/check-coverage.ts` once tests exist | CI |

---

## Open questions

These need answers before implementation. None of them blocks writing the tests for the parts that
are already clear.

1. **Which stablecoins and which chain?** Depends on what the ramp partner supports for GBP and CHF.
   The contract is token-agnostic, but gas costs and liquidity differ by chain.
2. **Settlement reference format.** Will the ramp partner send a unique ID per settlement that we can
   hash on-chain, or do we generate references ourselves and give one to each SME?
3. **Distribution currency.** Staking pays rewards in USDC. Repayments will arrive in GBP or CHF
   stablecoins. Either repayments are swapped to USDC before `notifyRewardAmount`, or a Staking
   instance is deployed per currency. This is a product decision with tax and FX consequences.
4. **Staking funding rule.** The fuzzer showed that Staking can promise more USDC than it holds if
   `notifyRewardAmount` is called without new funds (see INVARIANTS.md). If the registry forwards into
   Staking, `notifyRewardAmount` should pull the tokens itself so it cannot be called unfunded.
5. **Chargebacks.** If the ramp partner reverses a card payment after settlement, does it claw back
   stablecoin from FVC, or absorb the loss? This decides whether a repayment can ever be reversed
   on-chain. The current design assumes not: once recorded, a repayment is final, which is what
   invariant 4 encodes. If clawbacks are possible, card payments should only be recorded after the
   chargeback window closes.
6. **Legal status of the hash.** Legal Bison should confirm that publishing a hash of the signed
   agreement is acceptable under the confidentiality terms, and whether consumer credit rules apply
   to any SME borrowers (sole traders, small partnerships).
