# Martin diligence: questions and recommended answers

Status: internal draft, 21 November 2026.  
Source: follow-up email after the call with Martin.  
Audience: Igli / Jaz prep. Not for forwarding as-is until Legal Bison has reviewed A–D regulatory answers.

Labels on answers:

| Tag | Meaning |
|---|---|
| Ready | Consistent with current FVC position; safe to say on the walkthrough |
| Soften | Say carefully; avoid overclaiming |
| Needs Jaz | Numbers, economics, pipeline |
| Needs Legal Bison | Do not freestyle |
| Needs Saeed | Payments partner facts |
| Needs founders | Budget, spend to date, advisory deal shape |

Walkthrough plan he proposed: cover **E** on the technical call; agree commercial and regulatory workstreams after.

---

## A. Business model and capital structure

### 1. Complete lifecycle: investor capital → SME → repayment → investor return

**Recommended (Ready / Soften):**  
FVC Asset Group Ltd is the lender. It deploys **company capital** (starting capital from the FVC token sale, later also outside lending capital alongside its own) to a UK SME under an interest-free agreement. The SME receives GBP via the payments partner. The SME repays GBP (revenue share and/or fixed fee per deal). The partner settles stablecoin to the treasury Safe. The Loan Registry records each payout and repayment in the same transaction that moves the money. **Returned principal** stays available to lend again. **Income** (margin above principal) funds operations, USDC staking rewards for FVC stakers, reserves and token buy-backs. Token holders are not repaid like loan investors; they may receive staking rewards if they stake, and those rewards are not guaranteed.

Do not describe token buyers as “investors in the loan book.”

### 2. Where does SME lending capital come from?

**Recommended (Ready / Soften):**  
Near term: company treasury from the token raise, recycled principal, and income. To scale beyond that: outside lending capital alongside FVC’s own (credit facility, family office, institutional credit), kept distinct from the token. Not staking deposits and not “retail investment products” unless a regulated structure exists (Legal Bison).

**Needs Jaz:** mix and timing of outside capital.

### 3. Token purchase vs capital for SME lending

**Recommended (Ready):**  
Separate. Buying FVC does not buy a loan or a share of the portfolio. Staking FVC does not put the staker’s capital into SME loans. The company lends its own money. Stakers may receive USDC from **lending income**, not ownership of the loans.

### 4. Pooled vehicle vs individual SME agreements?

**Recommended (Ready / Soften):**  
Operationally, company capital is one treasury and many bilateral SME agreements. That is **not** the same as a CIS-style pool of external investors’ money into a fund. Outside lending capital, if raised, would be structured separately (e.g. facility or SPV) and kept apart from the token. Exact vehicle: Legal Bison.

### 5. Who legally owns the loans and collateral?

**Recommended (Ready):**  
FVC Asset Group Ltd (confirm exact contracting entity and any UK subsidiary with Legal Bison). Token holders do not own the loans or collateral.

### 6. How is income split (ops / investors / stakers / reserves)?

**Recommended (Needs Jaz):**  
Policy intent: margin pays (1) running FVC, (2) staking rewards, (3) reserves, (4) buy-backs. Percentages and priority of waterfall need a one-pager from Jaz. Do not invent shares on the call.

### 7. Capital for a pilot of 5–10 SMEs?

**Recommended (Needs Jaz):**  
Give a range tied to facility size (e.g. if average facility is £X, pilot book is roughly 5–10 × X plus ops buffer). Registry pilot limits today are £50k per loan / ~£50k USDC per day; those are security caps for the pilot, not the commercial target.

---

## B. Regulation and legal structure

### 8. Regulatory analysis / written UK FS advice?

**Recommended (Needs Legal Bison):**  
State factually what exists (engagement with Legal Bison on agreements / structure). If there is no written opinion yet covering lending, fundraising, staking and the token, say so and propose commissioning it as workstream 1. Do not imply you have advice you do not have.

### 9. Jurisdictions?

**Recommended (Ready):**  
Initial focus: UK limited company SMEs, GBP. Investors in the token sale are handled under existing sale terms / geography restrictions. International SMEs or inbound retail investment products are out of scope until counsel says otherwise.

### 10. Raising from retail investors?

**Recommended (Needs Legal Bison):**  
Token sale already has its own T&Cs and restrictions. **Pooled lending to retail** would need permissions, exemptions or an authorised partner. Do not sketch a retail fund on the call.

### 11. CIS / AIF / regulated investment arrangement?

**Recommended (Needs Legal Bison):**  
Company position: FVC lends its own money; token holders do not own the loans; staking is not a claim on the portfolio. Whether any arrangement is still a CIS or AIF is a legal question. Whitepaper BVI language is not a substitute for written advice. Answer: “Assessed as a priority with Legal Bison; we will not treat the token as a fund share.”

### 12. Legal classification of the FVC token?

**Recommended (Soft / Needs Legal Bison):**  
Intended as a **utility** cryptoasset: staking rewards (discretionary / not guaranteed), governance on larger deals, early access. Not equity, not a claim on loans or profits. Final classification is counsel’s call (UK / any relevant overseas).

### 13. Lending, financial promotion, payment services, AML?

**Recommended (Needs Legal Bison):**  
SME facilities are commercial lending by the company. Promotions, payment services (partner), and AML/KYC for token and borrowers need a mapped checklist. Partner handles payment rails; FVC remains responsible for what it originates and how it markets.

### 14. BVI vs UK operating entity?

**Recommended (Needs Legal Bison):**  
Describe only what is true today (which entity contracts, which holds treasury, which runs ops). Accountability and investor-protection story must come from counsel. Soften any “BVI avoids CIS” claim until confirmed in writing.

### 15. KYC / AML / sanctions / onboarding?

**Recommended (Soft):**  
Token sale / dapp: KYC integration in progress (server-side; vendor not required on the call). SME side: company KYC/AML and credit checks on founders as part of underwriting. Full process map: compliance workstream.

### 16. Partner with an FCA-authorised firm?

**Recommended (Ready):**  
Open to it where it is the faster lawful path (payments, promotions, or any investment product). Payments partner must confirm who holds authorisation (see 37). Prefer partnering over collecting every permission ourselves if counsel recommends it.

---

## C. SME lending economics and risk

### 17. Target SMEs?

**Recommended (Needs Jaz / Soft):**  
UK limited companies. Filter on runway, accounts, founder background/credit, risk score. Most applicants rejected. Sectors and size bands: Jaz/risk.

### 18. Typical amount and term?

**Recommended (Needs Jaz):**  
Commercial range TBD. On-chain pilot security limits: max £50k facility, ~£25k per payout tranche, ~£50k USDC/day (can be raised later via timelock).

### 19. How does FVC earn without interest?

**Recommended (Ready):**  
Per deal: revenue share and/or fixed fee (registry models owed = disbursed + fee; fee default can be zero). Average book return above principal is the margin. Equity only on a few larger deals; slow and cannot fund ops/staking alone.

### 20. Worked example: £100k facility?

**Recommended (Needs Jaz):**  
Must include: amount advanced, term/structure, fee or revenue-share, expected income, ops cost allocation, default provision, what reaches staking vs reserves vs buy-backs. Do not present without Jaz’s numbers.

### 21. Underwriting and who approves?

**Recommended (Ready / Soft):**  
Team vetting (accounts, runway, background, credit, risk score). Larger deals: token holders may vote on a shortlist; **company makes the final credit decision** and carries the risk. Community moderators, if used, advise; they do not displace company liability.

### 22. Defaults and recoveries?

**Recommended (Ready / Soft):**  
Company bears the loss. Collateral possible on some deals (registry supports deposit/claim/release). Default → cure → write-off on-chain statuses. Recovery process: ops + legal; details Needs Jaz / Legal Bison.

### 23. Assumed default / loss rates?

**Recommended (Needs Jaz):**  
From the financial model only. Do not invent a % on the call.

### 24. Profitability after distributions, compliance, tech, losses?

**Recommended (Needs Jaz):**  
Depends on margin, loss rate, and cost base. Answer with a simple sensitivity once the £100k example and pilot budget exist.

### 25. SME pipeline?

**Recommended (Needs Jaz / Soft):**  
State only what is real: interest conversations vs NDAs vs term sheets. If none committed, say early stage / building pipeline.

---

## D. Tokenomics, staking and investor returns

### 26. Why is the token necessary?

**Recommended (Ready / Soft):**  
Company capital formation and alignment: treasury from sale, staking funded by real USDC income, governance on larger deals, transparency of the book via on-chain registry. Lending itself could be done with stablecoins and a conventional vehicle; the token is not required for a single loan, it is how FVC raised starting capital and shares upside with holders **without** giving them the loans. A regulated fund share of returns would be a separate vehicle (“FVC Ventures” style), not the FVC token.

### 27. How does staking work?

**Recommended (Ready):**  
Holders stake **FVC** and earn **USDC** from company-funded reward periods (Synthetix-style staking contract, built, not deployed). They do not deposit stablecoins that are then lent. They do not own SME loans.

### 28. Principal vs income for staking rewards?

**Recommended (Ready):**  
Critical distinction:  
- **Principal** repaid → stays in treasury / lending pot for the next SME.  
- **Income** (fee / revenue-share margin) → may fund `notifyRewardAmount` on Staking, reserves, ops, buy-backs.  

Registry + reconciler + Safe approval make repayments explicit; ops/accounting must tag what is principal vs income before funding staking. Never distribute undeployed principal as “yield.”

### 29. Staking vs buy-and-burn?

**Recommended (Needs Jaz):**  
Both can run. Need a stated split of income. Until then: “both are intended; percentages not final.”

### 30. Rights over loans, treasury, profits?

**Recommended (Ready):**  
None as shareholders or creditors of the loan book. No legal claim on FVC Asset Group Ltd equity via the token (per sale terms / utility framing). Rewards not guaranteed.

### 31. Dilution / preferential allocations?

**Recommended (Soft):**  
Hard cap 1B. New minting needs minter role (Sale / Safe; later timelock). Vesting locks early buyers. Preferential OTC is possible via Safe/OTC mint; disclose that Sale owner can mint OTC. Timelock before TGE reduces surprise mint-and-dump risk. Full investor-protection narrative: Legal Bison + tokenomics sheet from Jaz.

### 32. Lending succeeds but token price does not?

**Recommended (Ready):**  
Possible. Token price is not a claim on NAV of the loan book. Company success funds more sustainable staking and buy-backs over time; it does not guarantee token performance. Do not promise indexation of the token to portfolio performance (that reads like a security).

---

## E. Technology, security and operations

### 33. What is live vs in development?

**Recommended (Ready):**  

| Piece | Status |
|---|---|
| FVC token, Sale, Vesting, treasury Safe | Mainnet |
| Staking | Built and tested; not deployed |
| Loan Registry | Built and tested on PR stack; not audited; not deployed |
| Reconciler | Built and tested; mock partner feed; not independently reviewed |
| Payments partner integration | Waiting on partner format / sandbox / licensing clarity |
| Hashlock | Engagement in progress; no final report |
| Timelock / 3-of-5 / deployer role removal | Planned / batch built; not all executed |

See technical walkthrough PDF (21 Nov wording).

### 34. Full lending lifecycle demo?

**Recommended (Ready):**  
Yes on test environment: create loan → disbursement → partner settlement (mock) → reconciler batch → Safe-style execute `recordRepayment` → forward / staking notify path. Not a mainnet SME yet. Script the demo for the call.

### 35. Hashlock status?

**Recommended (Ready / Soft):**  
In progress; no final report. Scope should include Sale/Vesting/Staking and, after Sepolia pilot, Loan Registry. Send Staking fix + scan findings when ready. No date promise unless Hashlock gave one.

### 36. 3-of-5 and deployer permissions?

**Recommended (Ready):**  
Honest: still **2-of-4**; deployer is still a signer and still holds token roles until Safe batch A executes and signers are rotated to **3-of-5** on hardware wallets. Batch is built and fork-simulated. Do not claim it is done.

### 37. Clicked / payments partner?

**Recommended (Needs Saeed / Soft):**  
Call it a **UK payments partner** until written confirmation of: Saeed’s role, contracting entity, who holds FCA (or other) authorisation, settlement assets, direct debit, sandbox date. Integration questions are in the partner doc / Clicked system review. Do not say “regulated” without proof.

### 38. Blockers to first real SME financing?

**Recommended (Ready):**  
(1) Partner sandbox + commercial/legal terms, (2) Sepolia end-to-end through a real Safe, (3) Hashlock (or scoped audit) on Loan Registry path, (4) Safe remediation + 3-of-5, (5) first credit-approved SME and signed agreement, (6) ops runbook (signer + pause procedure).

---

## F. Funding, strategy and consultancy

### 39. Founder capital invested to date?

**Recommended (Needs founders):**  
Give a real figure or range (tech, legal, ops). Do not invent.

### 40. Funding need next 12–18 months?

**Recommended (Needs founders / Jaz):**  
Split: platform/dev, regulatory/legal, operating expenses, **SME lending capital**. Lending capital is usually the largest line if the pilot is real.

### 41. Fundraising strategy?

**Recommended (Needs founders):**  
State order of preference (e.g. strategic/advisory first, then credit capital for the book, token/community secondary). Avoid “retail first” without Legal Bison.

### 42. What does an institutional investor buy?

**Recommended (Needs Legal Bison / founders):**  
Options to keep distinct: equity in the operating company; a credit facility / participation in the loan book via a separate vehicle; tokens (utility, with clear non-security framing). Do not blur them.

### 43. Milestones before external investment and first SME?

**Recommended (Ready):**  
Safe batch A + 3-of-5; partner clarity; Sepolia pilot; audit path clear; Legal Bison note on structure; worked economics (£100k + pilot pot); at least one credit-ready SME; signer/ops runbooks.

### 44. Where consultancy adds most value?

**Recommended (Ready):**  
Likely order: (1) regulatory structuring and permissions map, (2) commercial model / pilot underwriting, (3) banking/payments partner, (4) institutional credit introduction, (5) go-to-market. Tech is comparatively advanced; do not sell “build the contracts” as the main gap.

### 45. Form of commercial relationship?

**Recommended (Needs founders):**  
Decide before the call: fixed consultancy project, ongoing advisory, equity/options, or explore-then-propose. Martin’s email invites that conversation; go in with a preference.

---

## Suggested reply structure to Martin

1. Thanks; agree the three lenses (regulatory, commercial, technology).  
2. Technical walkthrough covers **E**; demo lifecycle on test rails.  
3. Company owns loans; token ≠ loan claim; staking funded by **income**, not principal.  
4. Written UK counsel is the next legal step; we will not pre-empt CIS/security classification.  
5. Before commercial session: £100k example, pilot capital, margin waterfall, open Legal Bison questions.  
6. Then agree which consultancy workstream is first.

---

## Open prep checklist

- [ ] Jaz: Q6, Q7, Q17–25, Q29  
- [ ] Legal Bison: Q8–16, Q22 (security/guarantees), Q42  
- [ ] Saeed in writing: Q37  
- [ ] Founders: Q39–41, Q45  
- [ ] Igli: demo script for Q34; honest status for Q33, Q35–36, Q38  
