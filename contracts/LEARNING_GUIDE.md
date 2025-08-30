# FVC Protocol - Smart Contract Learning Guide

## Overview

This guide uses spaced repetition principles to help developers learn and remember the FVC Protocol smart contract implementations. The FVC Protocol is **DeFi's First Venture Fund Protocol** - a comprehensive system for funding SMEs and startups through community governance and revenue sharing.

## Learning Schedule

### **Day 1: Core Concepts** (Initial Learning)
### **Day 3: Review** (First Reinforcement)
### **Day 7: Deep Dive** (Second Reinforcement)
### **Day 14: Application** (Third Reinforcement)
### **Day 30: Mastery** (Final Reinforcement)

---

## 🎯 **DAY 1: CORE CONCEPTS**

### 1. **What is the FVC Protocol?**

**Answer**: DeFi's First Venture Fund Protocol - a community-governed system that funds small and medium-sized enterprises (SMEs) and startups through interest-free, revenue-sharing agreements. FVC token holders vote on funding decisions and earn from successful investments.

**Key Points**:
- **Venture Funding**: Community votes on which businesses to fund
- **Revenue Sharing**: 8-15% of quarterly profits from funded projects
- **Interest-Free**: No traditional loans, just aligned incentives
- **Community Governance**: FVC token holders control all decisions
- **FCA-Compliant**: UK regulatory compliance with professional oversight

**Why Remember**: This is the foundation - FVC is a complete venture capital ecosystem, not just a token or bonding system.

---

### 2. **What are the main contract components?**

**Answer**: 
1. **FVC.sol** - ERC20 governance token (non-upgradeable)
2. **Bonding.sol** - Private sale token distribution (UUPS upgradeable)
3. **Governance Contracts** - Community voting and proposal management
4. **Treasury Contracts** - Fund management and revenue distribution
5. **Grants Contracts** - SME funding and revenue sharing
6. **Staking Contracts** - Token locking and reward distribution
7. **Compliance Contracts** - KYC/AML and regulatory compliance

**Key Points**:
- FVC: Immutable governance token for trust
- Bonding: Just one component for initial token distribution
- Governance: Core of the venture funding system
- Treasury: Manages collected funds and distributes revenue

**Why Remember**: Understanding the complete architecture is crucial for development and testing.

---

### 3. **How does the venture funding process work?**

**Answer**: 
1. SMEs/startups apply for funding with business plans
2. Professional team vets applications (90% filtered out)
3. Community votes on pre-vetted, high-quality projects
4. Approved projects receive funding through smart contracts
5. Revenue-sharing agreements automatically capture 8-15% of profits
6. Revenue flows to treasury and distributed to FVC stakers
7. One successful investment can generate millions in perpetual income

**Key Points**:
- Professional vetting eliminates noise
- Community governance selects winners
- Revenue sharing creates sustainable returns
- Smart contracts enforce agreements automatically

**Why Remember**: This is the core business model - everything else supports this venture funding process.

---

## 🔄 **DAY 3: FIRST REINFORCEMENT**

### 4. **What are the two grant systems and how do they work?**

**Answer**: 
**Small Grants** (Fast-track):
- Amount: $25,000 - $100,000
- Collateral: 10-30% in stable assets (BTC, ETH, USDC)
- Revenue Share: Percentage of gross revenue for 18-24 months
- Approval: 72-168 hours (fast-track vetting)
- Liquidation: Only for fraud or project abandonment

**Large Strategic Grants**:
- Amount: $100,000 - $500,000+
- Two models: Revenue share agreements OR direct equity/token investment
- Duration: Perpetual or fixed term
- Approval: Community vote after comprehensive vetting
- No collateral required

**Why This Structure**: Serves different business stages and capital needs while maintaining protocol security.

**Why Remember**: This affects all funding logic and smart contract design.

---

### 5. **How does staking work and what are the rewards?**

**Answer**: 
**Two-Tier System**:
- **Growth Staking**: 10,000 FVC minimum, 6-month lock, 7% APY
- **Partner Staking**: 50,000 FVC minimum, 12-month lock, 10% APY

**Reward Sources**:
- **Primary**: FVC tokens from protocol revenues
- **Secondary**: Protocol fees in USDC
- **Bonus**: Successful investment returns
- **Airdrops**: New portfolio tokens

**Key Points**:
- Rewards funded solely from actual business repayments
- No inflationary token printing
- Longer locks = higher rewards
- Early exit penalty: 25% on rewards

**Why Remember**: Staking is how users earn from the venture fund's success.

---

### 6. **What is the governance system and how does it work?**

**Answer**: 
**Quadratic Voting**: Voting power = √(staked FVC tokens)
- 100 FVC → 10 voting power
- 10,000 FVC → 100 voting power
- 1,000,000 FVC → 1,000 voting power

**Proposal Lifecycle**:
1. **Creation**: 1 FVC token required, 3-5 days discussion
2. **Voting**: 7 days active voting with 1-day delay
3. **Execution**: 48 hours minimum timelock (7 days for critical operations)
4. **Monitoring**: Post-execution impact assessment

**Key Features**:
- Quorum: 10% of total FVC supply must participate
- Vote delegation available
- Emergency pause system with guardian powers
- Progressive decentralization timeline

**Why Remember**: Governance controls all funding decisions and protocol parameters.

---

## 🚀 **DAY 7: DEEP DIVE**

### 7. **How does the revenue sharing and repayment system work?**

**Answer**: 
**Revenue Structure**:
- SMEs remit 8-15% of quarterly profits perpetually
- Treasury allocation: 50% to staking yield, 25% to buy & burn FVC, 25% to reserves
- Smart contracts automatically route revenue shares

**Verification System**:
- **Monthly**: P&L statements, live dashboard access, CEO/CFO attestation
- **Quarterly**: CPA-prepared financials, revenue breakdown, API audit logs
- **Annually**: Full audit, CPA review, tax return verification

**Enforcement**:
- Three missed payments trigger default proceedings
- Collateral liquidation where applicable
- Automated penalty calculations

**Why Remember**: This is the revenue engine that funds all staking rewards and protocol growth.

---

### 8. **How does the bonding system fit into the larger protocol?**

**Answer**: 
**Purpose**: Initial token distribution to fund the venture capital treasury
**Not the main protocol** - just the fundraising mechanism

**Bonding Details**:
- 225M FVC (22.5% of supply) allocated through private sale
- 4-tier pricing: $0.025 → $0.05 → $0.075 → $0.10
- Target: 20M USDC raised for treasury
- 12-month cliff + 24-month linear vesting

**Why This Structure**:
- Rewards early supporters
- Creates urgency and FOMO
- Maximizes capital raise for venture funding
- Industry standard approach

**Why Remember**: Bonding funds the treasury that will be deployed to SMEs and startups.

---

### 9. **What are the compliance and security features?**

**Answer**: 
**KYC/AML Integration**:
- Sumsub as primary KYC provider
- Whitelist mechanism with zero-knowledge proofs
- Periodic identity verification
- Excludes gambling, meme coins, adult content, unlicensed finance

**Security Measures**:
- Multi-signature wallets (3 of 5 signers)
- Timelock delays (48 hours minimum, 7 days for critical operations)
- Guardian emergency pause system
- Circuit breaker mechanisms
- UUPS upgradeable contracts with governance control

**Regulatory Compliance**:
- UK FCA standards
- Quarterly legal reviews
- Professional oversight
- Transparent reporting

**Why Remember**: Compliance and security are non-negotiable for institutional adoption and regulatory approval.

---

## 🎯 **DAY 14: APPLICATION**

### 10. **How do you test the venture funding system?**

**Answer**: 
```typescript
describe("Venture Funding System", function () {
  it("Should allow community to vote on funding proposals", async function () {
    // Arrange: Create funding proposal
    const proposal = await governance.createProposal(
      target, values, calldatas, description
    );
    
    // Act: Community votes
    await governance.connect(voter1).castVote(proposalId, 1); // For
    await governance.connect(voter2).castVote(proposalId, 0); // Against
    
    // Assert: Proposal passes if quorum met
    expect(await governance.state(proposalId)).to.equal(4); // Succeeded
  });
});
```

**Key Points**:
- Test governance proposal lifecycle
- Verify quadratic voting calculations
- Test quorum requirements
- Validate timelock delays

**Why Remember**: Testing ensures the venture funding decisions work correctly.

---

### 11. **How do you test revenue sharing and staking rewards?**

**Answer**: 
```typescript
describe("Revenue Sharing", function () {
  it("Should distribute revenue shares to stakers", async function () {
    // Arrange: Funded project generates revenue
    const revenue = ethers.parseEther("10000"); // 10K profit
    
    // Act: Revenue sharing contract processes payment
    await revenueSharing.processPayment(projectId, revenue);
    
    // Assert: Stakers receive proportional rewards
    const stakerReward = await staking.getReward(staker1.address);
    expect(stakerReward).to.be.gt(0);
  });
});
```

**Key Points**:
- Test revenue calculation and distribution
- Verify staking reward calculations
- Test early exit penalties
- Validate treasury allocations

**Why Remember**: Revenue sharing is the core economic model that funds all rewards.

---

### 12. **What are the key test categories for the complete protocol?**

**Answer**: 
1. **Governance Testing**: Proposal creation, voting, execution, timelock
2. **Venture Funding**: Application vetting, community voting, fund distribution
3. **Revenue Sharing**: Profit calculation, distribution, staking rewards
4. **Staking System**: Token locking, reward calculation, early exit penalties
5. **Compliance**: KYC verification, whitelist management, regulatory checks
6. **Treasury Management**: Fund allocation, revenue distribution, emergency controls
7. **Security**: Access control, emergency pause, circuit breakers
8. **Integration**: Cross-contract interactions, external API calls

**Why Remember**: Comprehensive testing ensures the venture funding protocol works correctly and securely.

---

## 🏆 **DAY 30: MASTERY**

### 13. **How does the complete FVC Protocol ecosystem work together?**

**Answer**: 
```
Token Distribution → Treasury Funding → Venture Investments → Revenue Generation → Staking Rewards
      ↓                    ↓                    ↓                    ↓                    ↓
Bonding (Private Sale) → Treasury Vault → Grants System → Revenue Sharing → Staking Vault
      ↓                    ↓                    ↓                    ↓                    ↓
FVC Token Holders → Community Governance → Funding Decisions → Business Success → Protocol Growth
```

**Key Points**:
- Bonding funds the treasury
- Treasury deploys to vetted businesses
- Revenue flows back to stakers
- Governance controls all parameters
- Success creates a virtuous cycle

**Why Remember**: Understanding the complete ecosystem enables better development and testing.

---

### 14. **What are the industry standards and competitive advantages?**

**Answer**: 
**Industry Standards**:
- **Testing**: 95%+ line coverage (like Uniswap, Aerodrome)
- **Security**: Multi-sig, timelock, emergency pause systems
- **Governance**: Quadratic voting, delegation, progressive decentralization
- **Compliance**: KYC/AML, regulatory frameworks, professional oversight

**Competitive Advantages**:
- **First DeFi Venture Fund**: No direct competitors in this space
- **Interest-Free Model**: Revenue sharing instead of predatory lending
- **Professional Vetting**: 90% of applications filtered before community vote
- **FCA Compliance**: UK regulatory clarity and institutional adoption
- **Perpetual Returns**: One successful investment generates ongoing revenue

**Why Remember**: Industry standards ensure quality, competitive advantages drive adoption.

---

### 15. **What's next for the FVC Protocol development?**

**Answer**: 
1. **Phase 1**: Core venture funding contracts and governance
2. **Phase 2**: Advanced staking and reward distribution
3. **Phase 3**: Cross-chain expansion and institutional tools
4. **Phase 4**: AI integration and advanced analytics

**Immediate Priorities**:
- Complete venture funding smart contracts
- Implement governance and voting systems
- Develop staking and reward mechanisms
- Integrate compliance and KYC systems
- Achieve 95%+ test coverage for mainnet readiness

**Why Remember**: Continuous development ensures the protocol remains competitive and secure.

---

## 📚 **QUICK REFERENCE**

### **Core Protocol Functions**

#### **Venture Funding**
- `createFundingProposal()` - Submit business for community vote
- `voteOnProposal()` - Community voting with quadratic weighting
- `executeProposal()` - Fund approved projects
- `processRevenueShare()` - Handle profit distributions

#### **Staking & Rewards**
- `stakeFVC(amount, lockPeriod)` - Lock tokens for rewards
- `claimRewards()` - Collect earned rewards
- `earlyExit()` - Exit before lock period (with penalty)
- `getStakingInfo()` - View staking status and rewards

#### **Governance**
- `createProposal()` - Submit governance proposal
- `castVote()` - Vote on proposals
- `executeProposal()` - Execute approved proposals
- `delegateVotes()` - Delegate voting power

#### **Compliance**
- `verifyKYC()` - Complete identity verification
- `checkWhitelist()` - Verify eligibility
- `updateCompliance()` - Periodic verification

### **Key Constants**
```solidity
TOTAL_SUPPLY = 1,000,000,000 FVC
PRIVATE_SALE_ALLOCATION = 225,000,000 FVC (22.5%)
TREASURY_ALLOCATION = 250,000,000 FVC (25%)
MARKETING_ALLOCATION = 305,000,000 FVC (30.5%)
FOUNDERS_ALLOCATION = 170,000,000 FVC (17%)
LIQUIDITY_ALLOCATION = 50,000,000 FVC (5%)
```

### **Test Patterns**
```typescript
// Governance testing
it("Should allow community voting on funding proposals", async function () {
  // Test proposal creation, voting, and execution
});

// Revenue sharing testing
it("Should distribute profits to stakers correctly", async function () {
  // Test revenue calculation and distribution
});

// Staking testing
it("Should calculate rewards based on lock period", async function () {
  // Test staking mechanics and reward calculations
});
```

---

## 🎯 **MASTERY CHECKLIST**

### **Day 1-3**: Basic understanding
- [ ] Can explain what the FVC Protocol does (venture funding)
- [ ] Knows the main contract components
- [ ] Understands the venture funding process

### **Day 7**: Technical depth
- [ ] Can explain revenue sharing mechanics
- [ ] Understands governance and voting systems
- [ ] Knows compliance and security features

### **Day 14**: Practical application
- [ ] Can write tests for venture funding
- [ ] Understands testing patterns for the protocol
- [ ] Knows all test categories

### **Day 30**: Complete mastery
- [ ] Can explain the complete ecosystem
- [ ] Understands industry standards and advantages
- [ ] Knows next steps for development

---

## 🚀 **NEXT STEPS**

1. **Review this guide** every week for the first month
2. **Practice writing tests** for each protocol component
3. **Study the actual contract code** alongside this guide
4. **Run the test suite** and understand failures
5. **Contribute to testing improvements** based on gaps identified

**Remember**: The FVC Protocol is a complete venture funding ecosystem, not just a token or bonding system. Understanding the venture capital mechanics, revenue sharing, and community governance is essential for proper development and testing.

**Key Insight**: This is DeFi's first venture fund - you're building the infrastructure for community-driven startup funding, not just another DeFi protocol.
