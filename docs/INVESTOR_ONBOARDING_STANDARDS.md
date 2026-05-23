# Investor Onboarding Standards

Industry best practices for managing seed/presale investors paying via fiat/bank transfer, based on SAFT frameworks and tokenized securities standards.

## Table of Contents

1. [SAFT Best Practices](#saft-best-practices)
2. [Off-Chain Commitment Tracking](#off-chain-commitment-tracking)
3. [Batch Vesting Deployment](#batch-vesting-deployment)
4. [KYC/AML Requirements](#kycaml-requirements)
5. [Investor Portal Best Practices](#investor-portal-best-practices)

---

## SAFT Best Practices

### What is a SAFT?

A **Simple Agreement for Future Tokens (SAFT)** is a legal contract granting an investor the right to receive tokens at a future date—typically at TGE (Token Generation Event) or when the network reaches a defined milestone.

### Key Principles

1. **Treat SAFT as a Security**
   - Comply with securities laws (Reg D 506(c), Reg S, or Reg A+)
   - SAFTs are investment contracts under most jurisdictions

2. **Accredited Investors Only**
   - Limit SAFT sales to accredited/qualified investors
   - Verify accreditation status with documentation
   - Maintain records of verification

3. **Comprehensive Disclosure**
   - Provide detailed offering documents
   - Disclose all risks: technology, team, regulatory, market
   - Include use of funds breakdown

4. **Clear Trigger Criteria**
   - Define token delivery milestones objectively
   - Measurable criteria (e.g., mainnet launch, TGE date)
   - Avoid ambiguous conditions

5. **Transfer Restrictions**
   - Implement 12-month lockup minimum
   - Technical enforcement via vesting contracts
   - Not just contractual language

6. **Token SPV**
   - Consider a Special Purpose Vehicle for token issuance
   - Separates token operations from main entity
   - Cleaner compliance structure

### Timing

- SAFTs typically signed 6-12 months before token launch
- Requires finalized tokenomics
- Network and protocol choices should be decided

---

## Off-Chain Commitment Tracking

### Database Records

Every fiat investment must be tracked with:

```
Investor Record
├── Personal Information
│   ├── Full legal name
│   ├── Email
│   ├── Country of residence
│   └── Accreditation status
├── Investment Details
│   ├── Investment amount (USD)
│   ├── Token allocation (FVC)
│   ├── Price per token
│   └── Payment method (wire, ACH, etc.)
├── Contract Reference
│   ├── SAFT/Agreement ID
│   ├── Signature date
│   └── Document hash (optional)
├── Vesting Terms
│   ├── Cliff period (days)
│   ├── Vesting duration (days)
│   └── TGE unlock percentage (if any)
├── Wallet Information
│   ├── Wallet address (when submitted)
│   ├── Submission timestamp
│   └── Verification status
└── Deployment Status
    ├── Status (pending/deployed/claimed)
    ├── Transaction hash
    └── Vesting schedule ID
```

### Audit Trail

Maintain complete history from:
1. Contract signed → 
2. Fiat received → 
3. Account created → 
4. Wallet submitted → 
5. Vesting deployed → 
6. Tokens claimed

### Reconciliation

- Match bank deposits to investor records
- Track discrepancies immediately
- Document resolution of any issues

---

## Batch Vesting Deployment

### Why Batch?

- Gas efficiency: Multiple vestings in one transaction
- Operational simplicity: Deploy all investors at once
- Timing: Align with TGE or public sale

### Gnosis Safe Batch Transactions

Use Safe Transaction Builder for multiple `mintOTC` calls:

```typescript
interface InvestorVesting {
  wallet: string;
  fvcAmount: bigint;
  cliffSeconds: number;
  durationSeconds: number;
}

function generateBatchTransaction(investors: InvestorVesting[]) {
  return {
    version: "1.0",
    chainId: "1",
    meta: { name: "Batch Investor Vesting Deployment" },
    transactions: investors.map(inv => ({
      to: SALE_CONTRACT_ADDRESS,
      value: "0",
      data: saleInterface.encodeFunctionData('mintOTC', [
        inv.wallet,
        inv.fvcAmount,
        inv.cliffSeconds,
        inv.durationSeconds
      ])
    }))
  };
}
```

### Gas Optimization

| Approach | Gas per Investor | Best For |
|----------|------------------|----------|
| Individual txs | ~150k each | 1-5 investors |
| Batch via Safe | ~100k each | 5-50 investors |
| Merkle claims | ~80k per claim | 50+ investors |

### Merkle Tree Alternative

For large numbers (100+), consider:
- Store Merkle root on-chain
- Investors claim individually with proof
- Lower upfront gas, spreads cost to claimants

---

## KYC/AML Requirements

### At Investment (SAFT Signing)

1. **Identity Verification**
   - Government-issued ID
   - Selfie/liveness check
   - Address verification

2. **Accreditation Check**
   - Income/net worth documentation
   - Professional certification letters
   - Third-party verification services

3. **Source of Funds**
   - Especially for crypto payments
   - Bank statements for fiat
   - Explanation of fund origin

### At Token Delivery

1. **Re-verification**
   - Confirm identity still valid
   - Check sanctions lists
   - Verify wallet ownership

2. **Wallet Verification**
   - Signed message proving ownership
   - Or small test transaction
   - Document wallet submission

### Record Keeping

- Maintain KYC records for 5-7 years minimum
- Secure storage with encryption
- Access audit logs
- GDPR compliance for EU investors

### Red Flags

- Mismatched names between ID and payment
- Payments from third parties
- Sanctioned countries
- Incomplete documentation

---

## Investor Portal Best Practices

### Design Principles

1. **Mobile-First**
   - Most investors complete onboarding on phones
   - Phone camera for ID capture
   - Responsive design essential

2. **Minimal Fields**
   - Only collect what's legally required
   - Each field costs conversions
   - Progressive disclosure

3. **Real-Time Status**
   - Show exactly where they are in process
   - What's verified, what's pending
   - Expected timelines

4. **Progressive Verification**
   - Basic checks first (browse, reserve)
   - Enhanced checks when committing capital
   - Don't frontload friction

### Portal Features

```
Investor Dashboard
├── Welcome + Status Overview
├── Investment Details
│   ├── Amount invested
│   ├── Token allocation
│   ├── Price per token
│   └── Contract reference
├── Vesting Schedule
│   ├── Cliff period
│   ├── Vesting duration
│   ├── Visual timeline
│   └── Estimated unlock dates
├── Wallet Management
│   ├── Submit wallet address
│   ├── Double-entry confirmation
│   ├── Cannot change warning
│   └── Verification status
├── Document Access
│   ├── SAFT copy
│   ├── Term sheet
│   └── Project documents
└── Support
    ├── Contact form
    ├── FAQ
    └── Office hours booking
```

### Wallet Submission Security

Critical: Wallet address cannot be changed after vesting deployment.

1. **Double Entry**
   - Enter address twice
   - Must match exactly
   - Visual comparison

2. **Warning Acknowledgment**
   - Checkbox: "I understand this cannot be changed"
   - Clear language about permanence
   - Contact info for issues

3. **Validation**
   - Check valid Ethereum address format
   - Warn if exchange address detected
   - Show ENS name if available

4. **Confirmation Period**
   - 24-48 hour window to cancel/change
   - Email confirmation sent
   - Final deployment only after window

### Communication

- **Email Updates**: Investment received, account created, wallet submitted, vesting deployed
- **Timeline Setting**: Clear expectations on processing time
- **Support Access**: Easy way to reach team for questions

---

## FVC-Specific Implementation

### Investor Types

1. **Crypto-Native**: Wallet → Buy directly → Vesting
2. **MoonPay Users**: Wallet → Card → Crypto → Buy → Vesting
3. **Fiat/OTC**: Contract → Bank → Portal → Wallet → Batch Vesting

### Vesting Terms (Standard)

- Cliff: 365 days (1 year)
- Duration: 730 days (2 years total)
- No TGE unlock for seed investors

### Batch Deployment Timing

- Collect wallet addresses up to 1 week before deployment
- Deploy in single Gnosis Safe batch
- Timing: Just before public sale or TGE

### Contracts

- Sale Contract: Handles `mintOTC()` for OTC investors
- Vesting Contract: Holds tokens with release schedule
- Gnosis Safe: Multi-sig for batch deployment approval
