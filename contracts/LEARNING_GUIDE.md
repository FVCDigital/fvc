# FVC Protocol - Smart Contract Learning Guide

## Overview

This guide uses spaced repetition principles to help developers learn and remember the FVC Protocol smart contract implementations. Each concept is presented with increasing intervals to reinforce learning and build long-term memory.

## Learning Schedule

### **Day 1: Core Concepts** (Initial Learning)
### **Day 3: Review** (First Reinforcement)
### **Day 7: Deep Dive** (Second Reinforcement)
### **Day 14: Application** (Third Reinforcement)
### **Day 30: Mastery** (Final Reinforcement)

---

## 🎯 **DAY 1: CORE CONCEPTS**

### 1. **What is the FVC Protocol?**

**Answer**: A milestone-based private sale bonding system that converts USDC to FVC governance tokens with progressive pricing and vesting schedules.

**Key Points**:
- USDC → FVC conversion
- 4-tier pricing structure ($0.025 → $0.10)
- 12-month cliff + 24-month linear vesting
- Total target: 20M USDC for 225M FVC

**Why Remember**: This is the foundation - everything else builds on this understanding.

---

### 2. **What are the two main contracts?**

**Answer**: 
1. **FVC.sol** - ERC20 governance token (non-upgradeable)
2. **Bonding.sol** - Bonding logic (UUPS upgradeable)

**Key Points**:
- FVC: Immutable for trust
- Bonding: Upgradeable for flexibility
- Bonding calls FVC.mint() during bonding

**Why Remember**: Understanding the contract architecture is crucial for development and testing.

---

### 3. **How does the bonding process work?**

**Answer**: 
1. User approves USDC spending
2. User calls `bond(usdcAmount)`
3. Contract calculates FVC amount based on current milestone
4. Contract creates vesting schedule
5. USDC goes to treasury, FVC tokens minted to user

**Key Points**:
- Automatic milestone progression
- Vesting schedule creation
- State updates before external calls

**Why Remember**: This is the core user journey - every test and feature relates to this flow.

---

## 🔄 **DAY 3: FIRST REINFORCEMENT**

### 4. **What are the 4 milestones and why this structure?**

**Answer**:
```
Early Bird: 0-416,667 USDC → $0.025 per FVC
Early Adopters: 416,667-833,333 USDC → $0.05 per FVC  
Growth: 833,333-1,250,000 USDC → $0.075 per FVC
Final: 1,250,000-20,000,000 USDC → $0.10 per FVC
```

**Why This Structure**:
- Rewards early supporters
- Creates urgency and FOMO
- Maximizes capital raise
- Industry standard approach

**Why Remember**: This affects all pricing calculations and user incentives.

---

### 5. **How does vesting work and why?**

**Answer**: 
- **0-12 months**: 0% vested (cliff period)
- **12-36 months**: Linear progression to 100%
- **Total duration**: 36 months

**Why This Schedule**:
- Cliff prevents immediate dumping
- Linear vesting aligns long-term incentives
- Industry standard for successful protocols
- Regulatory compliance

**Why Remember**: Vesting affects token transferability and user experience.

---

### 6. **What security features exist?**

**Answer**:
- **Access Control**: Role-based permissions
- **Reentrancy Protection**: OpenZeppelin's ReentrancyGuard
- **Circuit Breaker**: Emergency halt mechanism
- **Emergency Shutdown**: Complete protocol shutdown
- **Input Validation**: Comprehensive parameter checking

**Why Remember**: Security is non-negotiable for DeFi protocols.

---

## 🚀 **DAY 7: DEEP DIVE**

### 7. **How does the bond() function work internally?**

**Answer**:
```solidity
function bond(uint256 usdcAmount) external nonReentrant {
    // 1. Input validation
    if (usdcAmount == 0) revert Bonding__AmountMustBeGreaterThanZero();
    if (!privateSaleActive) revert Bonding__PrivateSaleNotActive();
    
    // 2. Milestone validation
    Milestone storage currentMilestoneData = milestones[currentMilestone];
    
    // 3. Calculate FVC amount
    uint256 fvcAmount = _calculatePreciseFVCAmount(usdcAmount, currentMilestoneData.price);
    
    // 4. Update state BEFORE external calls
    totalBonded = totalBonded + usdcAmount;
    userBonded[msg.sender] = userBonded[msg.sender] + usdcAmount;
    
    // 5. Create vesting schedule
    _vestingSchedules[msg.sender] = VestingSchedule({...});
    
    // 6. External calls AFTER state updates
    usdc.safeTransferFrom(msg.sender, treasury, usdcAmount);
    fvc.mint(msg.sender, fvcAmount);
}
```

**Key Points**:
- State updates before external calls (reentrancy protection)
- Comprehensive validation
- Vesting schedule creation
- Event emission

**Why Remember**: This is the most complex function - understanding it helps with all other aspects.

---

### 8. **How is FVC amount calculated?**

**Answer**:
```solidity
function _calculatePreciseFVCAmount(uint256 usdcAmount, uint256 price) internal pure returns (uint256) {
    uint256 numerator = usdcAmount * PRECISION;        // usdcAmount * 1e18
    uint256 denominator = price * PRICE_PRECISION;     // price * 1e3
    return numerator / denominator;
}
```

**Example**: 1000 USDC at $0.025 per FVC
- 1000 * 1e18 = 1,000,000,000,000,000,000,000
- 25 * 1e3 = 25,000
- Result: 40,000 FVC tokens

**Why Remember**: This affects all pricing tests and user calculations.

---

### 9. **How does milestone progression work?**

**Answer**:
```solidity
function _updateCurrentMilestone() private {
    uint256 _totalBonded = totalBonded;
    
    for (uint256 i = 0; i < milestones.length; i++) {
        if (_totalBonded < milestones[i].usdcThreshold) {
            if (currentMilestone != i) {
                currentMilestone = i;
                emit MilestoneReached(i, milestones[i].usdcThreshold, milestones[i].price);
            }
            break;
        }
    }
}
```

**Key Points**:
- Called after each bond() operation
- Automatically advances when threshold reached
- Emits event for frontend updates
- Prevents manual manipulation

**Why Remember**: This affects pricing and user experience.

---

## 🎯 **DAY 14: APPLICATION**

### 10. **How do you test the bonding system?**

**Answer**:
```typescript
describe("Bonding Functionality", function () {
  it("Should allow user to bond USDC for FVC tokens", async function () {
    // Arrange: Set up test conditions
    const usdcAmount = ethers.parseUnits("1000", 6);
    const expectedFVC = (usdcAmount * ethers.parseEther("1")) / BigInt(25 * 1000);
    
    // Act: Execute the function
    await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
    await bonding.connect(user1).bond(usdcAmount);
    
    // Assert: Verify the result
    expect(await fvc.balanceOf(user1Address)).to.equal(expectedFVC);
  });
});
```

**Key Points**:
- Arrange-Act-Assert pattern
- Proper USDC approval
- FVC amount calculation
- Balance verification

**Why Remember**: Testing is how you validate functionality works correctly.

---

### 11. **How do you test vesting mechanics?**

**Answer**:
```typescript
describe("Vesting Mechanics", function () {
  it("Should have 0% vested during cliff period", async function () {
    // Move to 6 months (still in cliff)
    const sixMonthsLater = startTime + (6 * 30 * 24 * 60 * 60);
    await ethers.provider.send("evm_setNextBlockTimestamp", [sixMonthsLater]);
    await ethers.provider.send("evm_mine", []);
    
    const (vestedAmount, totalAmount) = await bonding.getVestedAmount(user1Address);
    expect(vestedAmount).to.equal(0);
  });
});
```

**Key Points**:
- Use `evm_setNextBlockTimestamp` not `evm_increaseTime`
- Test specific time points
- Verify vesting calculations
- Test cliff and linear periods

**Why Remember**: Vesting is complex - proper testing prevents bugs.

---

### 12. **What are the key test categories?**

**Answer**:
1. **Initialization**: Contract setup and parameters
2. **Core Functionality**: Bonding and milestone logic
3. **Access Control**: Role-based permissions
4. **Edge Cases**: Boundary conditions and errors
5. **Mathematical Precision**: Calculations and rounding
6. **Security**: Reentrancy and attack prevention
7. **Emergency**: Circuit breaker and shutdown
8. **Integration**: Cross-contract interactions

**Why Remember**: Comprehensive testing requires covering all categories.

---

## 🏆 **DAY 30: MASTERY**

### 13. **How does the complete system work together?**

**Answer**: 
```
User → USDC Approval → Bonding.bond() → FVC.mint() → Vesting Schedule
  ↓
USDC → Treasury Address
  ↓
FVC Tokens → User (Locked in Vesting)
  ↓
12-Month Cliff → 24-Month Linear Vesting → Fully Unlocked
  ↓
Governance Participation + Value Accrual
```

**Key Points**:
- Each component has a specific purpose
- Security at every layer
- Transparent and auditable
- User-centric design

**Why Remember**: Understanding the complete system enables better development and testing.

---

### 14. **What are the industry standards we're following?**

**Answer**:
- **Testing**: 95%+ line coverage (like Uniswap, Aerodrome)
- **Security**: OpenZeppelin patterns and best practices
- **Architecture**: Separation of concerns and upgradeability
- **Documentation**: Comprehensive testing guides and analysis
- **Emergency**: Circuit breaker and shutdown mechanisms

**Why Remember**: Industry standards ensure protocol quality and user trust.

---

### 15. **What's next for the testing suite?**

**Answer**:
1. **Emergency Testing**: Circuit breaker and shutdown scenarios
2. **Stress Testing**: Maximum amounts and concurrent operations
3. **Attack Prevention**: Flash loan and manipulation resistance
4. **Integration Testing**: Cross-contract consistency
5. **Gas Optimization**: Efficiency improvements

**Why Remember**: Continuous improvement is essential for mainnet readiness.

---

## 📚 **QUICK REFERENCE**

### **Contract Functions by Category**

#### **Core Bonding**
- `bond(usdcAmount)` - Main bonding function
- `startPrivateSale(duration)` - Begin sale
- `endPrivateSale()` - End sale

#### **View Functions**
- `getCurrentPrice()` - Current FVC price
- `getCurrentMilestone()` - Current milestone data
- `calculateFVCAmount(usdcAmount)` - Preview FVC allocation
- `getSaleProgress()` - Overall sale status

#### **Vesting Functions**
- `getVestedAmount(user)` - User's vested tokens
- `isLocked(user)` - Check if tokens are locked
- `vestingSchedules(user)` - User's vesting schedule

#### **Emergency Functions**
- `activateCircuitBreaker()` - Halt operations
- `triggerEmergencyShutdown()` - Complete shutdown
- `emergencyWithdraw()` - User withdrawal

### **Key Constants**
```solidity
MAX_WALLET_CAP = 2,000,000 USDC
TOTAL_SALE_TARGET = 20,000,000 USDC
TOTAL_FVC_ALLOCATION = 225,000,000 FVC
CLIFF_DURATION = 365 days (12 months)
VESTING_DURATION = 730 days (24 months)
```

### **Test Patterns**
```typescript
// Basic test structure
it("Should [expected behavior]", async function () {
  // Arrange: Set up test conditions
  // Act: Execute the function
  // Assert: Verify the result
});

// Error testing
await expect(contract.function()).to.be.revertedWithCustomError(contract, "ErrorName");

// Event testing
await expect(contract.function()).to.emit(contract, "EventName");
```

---

## 🎯 **MASTERY CHECKLIST**

### **Day 1-3**: Basic understanding
- [ ] Can explain what the protocol does
- [ ] Knows the two main contracts
- [ ] Understands the bonding process

### **Day 7**: Technical depth
- [ ] Can explain internal function logic
- [ ] Understands calculations and math
- [ ] Knows security features

### **Day 14**: Practical application
- [ ] Can write basic tests
- [ ] Understands testing patterns
- [ ] Knows test categories

### **Day 30**: Complete mastery
- [ ] Can explain the complete system
- [ ] Understands industry standards
- [ ] Knows next steps for improvement

---

## 🚀 **NEXT STEPS**

1. **Review this guide** every week for the first month
2. **Practice writing tests** for each function
3. **Study the actual contract code** alongside this guide
4. **Run the test suite** and understand failures
5. **Contribute to testing improvements** based on gaps identified

**Remember**: Smart contract development is a skill that improves with practice. Use this guide as a foundation, but always verify your understanding against the actual code.
