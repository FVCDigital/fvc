# Reconciler runbook

Status: draft, 20 Nov 2026. Spec: [`reconciler.md`](./reconciler.md). Code: [`reconciler/`](../../reconciler).

Part A is a one-off end-to-end run on Sepolia, done by the owner with their own keys. Part B is
day-to-day operation. The reconciler itself never holds a key: every on-chain step below is done by
a person, from a wallet or the Safe app.

---

## Part A: Sepolia end to end

### What you need

- Node 24 (`node --version`), and `npm install` done in `contracts/`.
- A **test** Safe on Sepolia (not the treasury Safe) and its signers.
- A deployer key with Sepolia ETH, in `contracts/.env` as `DEPLOYER_PRIVATE_KEY`, and
  `ETHEREUM_SEPOLIA_RPC`. The deployer gets no role in the registry.
- A test wallet playing the partner, with Sepolia ETH and Sepolia USDC
  (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`, from Circle's faucet). The test Safe needs
  127 USDC as well, for the test tranche.
- Two RPC URLs from different providers: one for the reconciler, one for signers' `verify-batch`.

### Steps

1. **Deploy** (deployer key):

   ```bash
   cd contracts
   LOAN_SAFE_ADDRESS=<test Safe> PARTNER_DEPOSIT_ADDRESS=<partner test wallet> \
     npx hardhat run scripts/deploy-loan-registry.ts --network sepolia
   ```

   Every check must print `pass`. It writes `safe-batches/loan-registry-sepolia/` with
   `1-schedule.json`, `2-execute-after-48h.json` and `deployment.json` (which includes
   `deployBlock`).

2. **Timelock setup** (Safe signers): sign `1-schedule.json` in the Transaction Builder. After 48
   hours sign `2-execute-after-48h.json`. This allows USDC and approves the partner wallet as a
   payout destination.

3. **Reconciler config** (reads only):

   ```bash
   cd ../reconciler
   npm ci
   export RECONCILER_RPC_URL=<reconciler RPC>
   node scripts/make-config.ts \
     --deployment ../contracts/safe-batches/loan-registry-sepolia/deployment.json \
     --token USDC:0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
     --gbp-rate USDC:1.27 --depth 3 --out config.local.json
   ```

   Use today's GBP/USD rate for `--gbp-rate` and the same rate in step 6. `--depth 3` keeps the
   test quick; production uses `finalized` (leave `--depth` out).

4. **Test loan** (writes a Safe batch, sends nothing):

   ```bash
   node scripts/loan-batch.ts --config config.local.json --reference FVC-T1 \
     --facility 100.00 --fee 5.00 --tranche 100.00 --token USDC --rate 1.27 \
     --payout-id po_t1 --to <partner test wallet>
   ```

   Signers execute `out/setup/loan-1-FVC-T1.json`. It creates loan 1 and pays the 100.00 GBP
   tranche (127 USDC) to the partner wallet. The script adds `FVC-T1` to `loans.json`, which is
   private and gitignored.

5. **Repayment on-chain** (partner test wallet): send 12.70 USDC to the test Safe. Copy the tx hash.

6. **Partner message** (signed with a test secret, written to `inbox/`):

   ```bash
   export PARTNER_WEBHOOK_SECRET=$(openssl rand -hex 32)
   node scripts/mock-settlement.ts --config config.local.json --tx <hash> \
     --id tx_t1 --reference FVC-T1 --gbp 10.00 --rate 1.27
   ```

   Keep the same secret for the rest of the run.

7. **Reconcile** (after 3 more blocks, about 40 seconds):

   ```bash
   npm run reconcile -- run --config config.local.json
   ```

   Expected: `wrote batch B-<id> to out/batches`, exit 0. Read `out/reports/report-<date>.md`
   and `out/batches/B-<id>.md`.

8. **Verify as a signer** (spec section 14, with the second RPC):

   ```bash
   VERIFY_RPC_URL=<other RPC> npm run reconcile -- verify-batch out/batches/B-<id>.json \
     --chain-id 11155111 --safe <test Safe> --registry <registry> --depth 3
   ```

   Every line must be `PASS`.

9. **Sign** (Safe signers): load `B-<id>.json` in the Transaction Builder; check that the two
   transactions (approve, then `recordRepayment` for loan 1, 1000 pence) match the summary; sign
   and execute.

10. **Reconcile again**: `npm run reconcile -- run --config config.local.json` prints
    `no batch; three-way check ok`. On Etherscan the registry shows `RepaymentRecorded`;
    `loans(1).repaidGbp` is 1000 and `outstandingGbp(1)` is 9500.

11. **Negative cases** (recommended, each followed by a run and a read of the report):

    | Do this | Expect |
    |---|---|
    | Send 12.70 USDC again; `mock-settlement ... --id tx_t2 --claim 13.000000` | Less arrived than the message claims: `underpayment / SHORT_SETTLEMENT`; nothing batched |
    | `mock-settlement ... --id tx_t3` with a different `PARTNER_WEBHOOK_SECRET` | Rejected delivery `BAD_SIGNATURE` |
    | Send 0.50 USDC from any wallet, no message | After 24 hours: dust, collapsed in the report |
    | `mock-settlement --config config.local.json --reverse tx_t1 --id rev_t1 --gbp 10.00` | Run exits 3; `CORRECTION_REQUIRED` alert (registry v1 cannot undo a recorded repayment) |
    | Run `verify-batch` on the executed batch from step 8 | `FAIL ... ref already used on-chain`, exit 3 |

12. **Keep the evidence**: the reports, the batch files, and the head hash from
    `npm run reconcile -- verify-log --config config.local.json`.

## Part B: operating it

### Running

- One pass: `npm run reconcile -- run --config <file>`. On a schedule:
  `npm run reconcile -- watch --config <file> --every 300` under systemd or cron, restarted on
  exit. It stops on a halt (exit 2) and does not restart itself.
- Environment: `RECONCILER_RPC_URL`, `PARTNER_WEBHOOK_SECRET`. Signers set `VERIFY_RPC_URL` on
  their own machines.
- Private files, never committed: `loans.json` (R9), `config.local.json`, `data/`, `inbox/`, `out/`.

### Exit codes

| Code | Meaning | Do |
|---|---|---|
| 0 | Pass done, three-way check ok | Read the report |
| 1 | Error (bad settings, RPC down, missing env) | Fix and rerun; nothing half-done needs undoing |
| 2 | Halted: settings disagree with the chain, deep reorg, or another run holds `data/.lock` | A person reads the alert before anything else runs |
| 3 | Three-way check failed (or `verify-batch` failed) | Resolve every diff in the report's Alerts; sign nothing meanwhile |

### Halts

- **PREFLIGHT_FAILED**: chain ID, `registry.safe()` or token decimals differ from settings. Check
  the RPC points at the right network and the settings at the right registry.
- **DEEP_REORG**: the cursor block's hash changed. Compare the block on two explorers. If the chain
  really reorganised below the depth, raise the depth (or use `finalized`), move `data/` aside and
  rebuild from `startBlock`; the old log is kept as evidence. Signers check any live batch with
  `verify-batch` before signing.
- **Lock held**: `pgrep -af "src/cli.ts"`. If no reconciler is running, the last one was killed;
  remove `data/.lock`.
- **Event log broken**: stop. Copy `data/events.jsonl` aside. If the error names the last record
  and says the line is not JSON, the write was cut short by a crash: remove that last line only,
  then `verify-log`. Any other break means the file was changed: keep it as evidence and rebuild
  from `startBlock` in a fresh `data/`.

### Daily

- Read the report. Every line under "Needs a person" is resolved by a person (the reconciler never
  resolves anything); "Partner messages with no deposit" goes to the partner.
- Copy the event-log head hash (`verify-log`) somewhere off the host.
