# Ramp partner integration: Loan Registry v1

Status: draft, 20 Nov 2026. Written for the first call with the on/off-ramp partner. Values marked
**to confirm** come from the partner and must be filled in before the deploy batch is queued.

Read with [`contracts/LOAN_REGISTRY.md`](../../contracts/LOAN_REGISTRY.md) (the contract),
[`system.md`](./system.md) sections 6 and 7 (currency model and flows) and
[`reconciler.md`](./reconciler.md) (how settlement messages are matched to deposits and loans).

---

## 1. What the partner does, and what it never does

The partner converts money. Nothing more.

- **Off-ramp (payout).** It receives USDC or USDT from the Loan Registry at one deposit address and
  pays GBP to the SME's UK bank account.
- **On-ramp (repayment).** It collects GBP from the SME and sends USDC or USDT to the Treasury Safe,
  with a settlement message (GBP collected, tokens sent, its transaction ID, our payment reference).

The partner **never** calls the Loan Registry, holds no role, holds no token allowance on the Safe or
the registry, and never signs anything for FVC. There is no partner-facing Solidity interface by
design: the integration surface is (a) the partner's deposit address, which the registry may pay,
(b) the partner's API or webhook, read by the reconciler, and (c) the registry's events.

## 2. Trust boundaries

| Item | Who sets it | Trusted? | Why, and what checks it |
|---|---|---|---|
| Deposit address for payouts | Partner tells us; timelock adds it (48 hours) | Only after a second-channel check | A changed address is the main fraud route. Confirm on a call to a known number, then `addDestination`. The old one is removed at once with `removeDestination`. |
| GBP amount on a repayment | Partner's settlement message | **No** | Cannot be checked on-chain. The rate band rejects pence typed as pounds and gross errors; the signers compare it with the partner's dashboard. |
| Token amount on a repayment | On-chain transfer | Yes, measured | `_pullExact` reverts unless the registry's balance rises by exactly that amount. |
| Partner transaction ID | Partner | Only for uniqueness | Hashed into the ref; the registry accepts each ref once. It does not prove the money arrived. |
| Which loan a payment belongs to | Our payment reference, matched by the reconciler | **No** | The reconciler matches exactly or reports; signers check before signing (system.md 7.5). |
| Payout confirmation | Partner | **No** | Recorded only for reconciliation. A tranche is recorded when the stablecoin is sent, not when GBP lands. |
| Limits (min, max, daily) | Partner publishes; timelock sets ours to fit inside them | Ours are enforced | Our limits are never above the partner's, so a payout the partner would reject cannot be sent. |
| Webhook payloads | Partner | **No**, until authenticated and confirmed | See section 7. A webhook only triggers a check; it never triggers a Safe proposal alone. |

## 3. Roles

| Role | Holder | Used for in this integration |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | TimelockController, 48 hours, Safe proposes, executes and cancels | Adding the partner's address, allowing tokens, setting limits |
| `ORIGINATOR_ROLE` | Safe | `createLoan`, `recordDisbursement` (sends to the partner) |
| `RECORDER_ROLE` | Safe | `recordRepayment`, `depositCollateral` |
| `RISK_ROLE` | Safe | Default, cure, write-off, collateral |
| `DISTRIBUTOR_ROLE` | Safe | `forward` repaid money to the Safe for Staking |
| `GUARDIAN_ROLE` | Safe | Pause, remove the partner's address, lower limits, at once |
| Partner | none | none |
| Reconciler | none | Reads partner messages and the chain; writes batch files a signer proposes; never signs, never proposes, holds no key |

The operator roles (originator, recorder, risk, distributor, guardian) are separate from the admin
role. Anything that widens what the operators can do waits 48 hours in the timelock.

## 4. Limits to match the partner

All amounts are per token, in token units (6 decimals for USDC and USDT). Values are **to confirm**.

| Registry setting | Set by | Rule | Partner value to ask for |
|---|---|---|---|
| `minTranche[token]` | Timelock, `setMinTranche` | Every tranche at least this; never above `maxPayout` | Minimum single payout |
| `maxPayout` | Timelock, `setTokenLimits`; guardian may lower | Every single outflow at most this | Maximum single payout |
| `dailyLimit` (UTC day) | Timelock, `setTokenLimits`; guardian may lower | Sum of outflows per UTC day at most this | Daily limit, and whether its day is UTC |
| `maxFacilityGbp` | Timelock; guardian may lower | Per-loan facility | Not a partner limit; risk policy |
| Rate band (`minRateBps`, `maxRateBps`) | Timelock | Tokens per pound within the band | Not a partner limit; 1.10 to 1.50 USD per GBP proposed |

`minTranche` binds only tranches. Repayments of any size are accepted, so a small final repayment is
never stuck. If the partner's minimum applies to repayments too, it enforces that on its side.

## 5. Idempotency: one partner transaction, one record

The registry keeps one set of used refs across tranches, repayments and collateral, and rejects any
ref seen before (`LoanRegistry__RefAlreadyUsed`). The reconciler derives each ref from the partner's
transaction ID with a kind prefix, so the same ID can never be credited twice and two different
kinds can never collide:

```text
payoutRef      = keccak256(abi.encode("fvc.payout.v1",     partnerTxId))
settlementRef  = keccak256(abi.encode("fvc.settlement.v1", partnerTxId))
returnRef      = keccak256(abi.encode("fvc.return.v1",     partnerTxId))   // bounced payout coming back
collateralRef  = keccak256(abi.encode("fvc.collateral.v1", partnerTxId))
claimRef       = keccak256(abi.encode("fvc.claim.v1",      loanId, claimNumber))
```

`partnerTxId` is the partner's own ID as a UTF-8 string, exactly as it sends it. A payout's ID only
exists after the payout, so the payout ref uses the partner's quote or order ID instead (**to
confirm** which ID exists before the transfer). Retrying a Safe batch with the same ref is safe:
the second attempt reverts and changes nothing.

## 6. Flows

### 6.1 Payout (tranche)

1. The signers approve `recordDisbursement(loanId, gbpAmount, token, tokenAmount, payoutRef, partnerAddress)`
   in one Safe batch with `token.approve(registry, tokenAmount)`. For USDT, the batch starts with
   `approve(registry, 0)`, because USDT rejects changing a non-zero allowance.
2. The registry checks role, pause, loan, token, minimum, ref, facility, rate band, destination,
   per-payout and daily limits; pulls exactly `tokenAmount` from the Safe; sends it to the partner.
3. The partner pays GBP to the SME and confirms. The reconciler matches the confirmation to the
   `TrancheDisbursed` event by `payoutRef`.

### 6.2 Repayment

1. The SME pays GBP to the partner with its payment reference.
2. The partner sends stablecoin to the Safe and a settlement message.
3. The reconciler waits for finality (section 8), matches the reference to a loan, checks the
   amounts and the implied rate, derives `settlementRef`, and writes a batch of
   `approve(registry, tokenAmount)` plus `recordRepayment(loanId, gbpAmount, token, tokenAmount, settlementRef)`
   for the signers to verify and propose.
4. The registry rejects a repayment on a loan that has paid out nothing (`NothingDisbursed`), past
   what is owed (`OwedExceeded`), or outside the rate band.

`gbpAmount` is the pound value of the stablecoin that arrived, after the partner's conversion fee
(decided 19 Nov; **to confirm** the partner reports this per payment). The business bears its own
conversion cost.

### 6.3 Failure and refund paths

| Failure | What happens on-chain | What happens off-chain |
|---|---|---|
| SME's bank rejects the GBP payout | The tranche stays recorded. When the partner returns the stablecoin to the Safe, it is recorded with `recordRepayment` under `returnRef`, with `gbpAmount` equal to the tranche's GBP, so what the SME owes nets out. | The Safe keeps that money out of Staking (returned principal, not income). Partner to confirm it returns to the Safe and with which ID (D10). |
| The partner cannot pay out at all (outage) | Nothing to record if the tranche was not sent. If it was sent, as above. | Signers hold further tranches; the guardian can lower limits or pause at once. |
| SME overpays | The registry rejects the whole amount (`OwedExceeded`). The signers record exactly `outstandingGbp`. | The excess stablecoin goes back to the partner, which refunds the SME in GBP. |
| Payment matches no loan | Nothing recorded. | Stays in the Safe; partner asked which SME (D9). |
| Duplicate settlement message | The second record reverts (`RefAlreadyUsed`). | Reported as a duplicate. |
| Message and on-chain amount disagree | Only the amount that arrived can be recorded. | Partner asked to correct. |
| Card chargeback after recording | Not reversible in v1. | The partner must only settle final payments (R8, D4). |
| Partner's deposit address compromised | Guardian calls `removeDestination` and `pause` at once. | New address added through the timelock after a second-channel check. |

## 7. Webhook authentication (reconciler side)

The contract verifies no signatures; every call comes from the Safe. The reconciler must still
treat partner messages as untrusted input:

1. TLS only. If the partner offers it, an IP allowlist.
2. An HMAC-SHA256 signature over the raw body and a timestamp, with a shared secret kept in the
   reconciler's secret store (never in the repository). Reject on a bad signature, or a timestamp
   more than 5 minutes off.
3. Store each webhook's event ID and ignore repeats.
4. Never act on the webhook alone: a repayment is batched only for a stablecoin transfer the
   message names and the reconciler has seen on-chain at finality, and the signers compare each
   row with the partner's dashboard before signing. Fetching the transaction back from the
   partner's API is not built yet; it needs the partner's API (**to confirm**).

## 8. Reconciliation

### 8.1 Confirmation depth

Treat an Ethereum transaction as final only once its block is at or below the `finalized` block
tag (about two epochs, roughly 13 minutes on mainnet; the same tag on Sepolia). Before that, the
reconciler shows it as pending. This applies both to the partner's transfer into the Safe and to the
registry's own events.

### 8.2 Events to index

| Event | Fields | Joins to |
|---|---|---|
| `LoanCreated` | `loanId` (indexed), `agreementHash`, `smeRef`, `facilityGbp`, `feeGbp` | Private loan-to-SME mapping (off-chain, R9) |
| `TrancheDisbursed` | `loanId` (indexed), `gbpAmount`, `token` (indexed), `tokenAmount`, `payoutRef` (indexed), `to` | Partner payout confirmation by `payoutRef` |
| `FacilityClosed` | `loanId` (indexed), `disbursedGbp` | |
| `RepaymentRecorded` | `loanId` (indexed), `gbpAmount`, `token` (indexed), `tokenAmount`, `settlementRef` (indexed) | Partner settlement by `settlementRef`; Safe inbound transfer by amount and time |
| `LoanRepaid` | `loanId` (indexed), `repaidGbp` | |
| `LoanStatusChanged` | `loanId` (indexed), `from`, `to` | Risk view |
| `CollateralDeposited`, `CollateralClaimed` | `loanId`, `token`, `tokenAmount`, `gbpAmount`, `ref` | |
| `CollateralReleased` | `loanId`, `token`, `tokenAmount`, `to` | |
| `Forwarded` | `token` (indexed), `amount`, `to` (indexed) | Staking `notifyRewardAmount` |
| `DestinationAdded`, `DestinationRemoved`, `TokenLimitsSet`, `MinTrancheSet`, `Paused`, `Unpaused` | as declared | Monitoring alerts |

Every record also has the transaction hash, block number and log index, which make the Xero line
unique (R14).

### 8.3 Daily checks

For each token, at the latest finalized block:

- `balanceOf(registry) >= totalReceived - totalForwarded + totalCollateralHeld`.
- Sum of `RepaymentRecorded.tokenAmount` plus claims equals `totalReceived`.
- Every `TrancheDisbursed` has a partner payout confirmation; every partner settlement has a
  `RepaymentRecorded` or sits on the unmatched list.
- The implied rate (`tokenAmount / gbpAmount`) of each record is within 2 percent of the day's
  market rate; anything outside is flagged.

## 9. Questions the partner must answer before deploy

Each maps to a setting or a decision above: deposit address and how a change is confirmed (2);
minimum, maximum and daily payout limits (4); which IDs exist before and after a payout (5);
whether the GBP figure is net of its fee, per payment (6.2); how a bounced payout returns (6.3,
D10); unmatched payments (D9); chargebacks and when a payment is final (D4); webhook signing and
replay protection (7); Ethereum mainnet and which stablecoins (D3).

For the reconciler ([`reconciler.md`](./reconciler.md) section 15): the settlement and reversal
message format, including the on-chain transaction hash of each transfer; the addresses the
partner sends stablecoin from; how long direct-debit returns and card chargebacks can arrive
after settlement; and the exchange-rate source to check each settlement's rate against.
