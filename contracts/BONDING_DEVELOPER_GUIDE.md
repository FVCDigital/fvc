# FVC Protocol - Bonding Developer Guide

## Overview

This guide is designed to make you **self-sufficient** as the FVC Protocol developer. You'll learn the complete end-to-end bonding process, understand how the smart contracts work, and be able to debug, modify, and extend the system without external assistance.

**Goal**: Become the expert on your own codebase

---

## 🎯 **What You'll Learn**

1. **Smart Contract Fundamentals** - How Solidity works in your contracts
2. **Bonding Process Flow** - Complete user journey from start to finish
3. **Contract Architecture** - How FVC.sol and Bonding.sol work together
4. **Testing Strategy** - How to write and run tests effectively
5. **Debugging Techniques** - How to troubleshoot issues independently
6. **Extension Patterns** - How to add new features safely

---

## 📚 **Prerequisites**

### **What You Should Already Know**
- Basic JavaScript/TypeScript
- Basic understanding of blockchain concepts
- Familiarity with command line tools

### **What You'll Learn Here**
- Solidity smart contract development
- Hardhat testing framework
- DeFi protocol architecture
- Security best practices

---

## 🏗️ **Smart Contract Fundamentals**

### **1. Understanding Solidity Basics**

#### **Contract Structure**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Bonding is AccessControl {
    // State variables - stored on blockchain
    uint256 public totalBonded;
    mapping(address => uint256) public userBonded;
    
    // Events - for frontend notifications
    event BondCreated(address indexed user, uint256 usdcAmount, uint256 fvcAmount);
    
    // Functions - executable logic
    function bond(uint256 usdcAmount) external {
        // Function logic here
    }
}
```

**Key Concepts**:
- **State Variables**: Data stored permanently on blockchain
- **Functions**: Executable code that can read/write state
- **Events**: Notifications that frontend can listen to
- **Mappings**: Key-value storage (like dictionaries)

#### **Why This Matters for Bonding**
- `totalBonded` tracks how much USDC has been collected
- `userBonded` tracks each user's contribution
- `BondCreated` event tells frontend to update display

### **2. Access Control System**

#### **How Roles Work**
```solidity
contract Bonding is AccessControl {
    bytes32 public constant BONDING_MANAGER_ROLE = keccak256("BONDING_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BONDING_MANAGER_ROLE, msg.sender);
    }
    
    function startPrivateSale(uint256 duration) external onlyRole(BONDING_MANAGER_ROLE) {
        // Only bonding managers can start sales
    }
}
```

**Why This Matters**:
- **Security**: Prevents unauthorized access to admin functions
- **Multi-signature**: Multiple people can have admin access
- **Emergency Control**: Emergency roles can halt operations if needed

---

## 🔄 **End-to-End Bonding Process**

### **Step 1: User Approves USDC Spending**

#### **What Happens**
1. User calls `usdc.approve(bondingContractAddress, amount)` on USDC contract
2. USDC contract records that user has approved bonding contract to spend their USDC
3. Frontend shows "Approval successful"

#### **Why This Step Exists**
- **ERC20 Standard**: All ERC20 tokens require approval before transfer
- **Security**: Prevents contracts from stealing user tokens
- **User Control**: User explicitly allows the bonding contract to use their USDC

#### **Code Location**
```solidity
// In USDC contract (not yours)
function approve(address spender, uint256 amount) external returns (bool) {
    _approve(msg.sender, spender, amount);
    return true;
}
```

### **Step 2: User Calls bond() Function**

#### **What Happens**
1. User calls `bonding.bond(usdcAmount)` from their wallet
2. Bonding contract validates the request
3. Contract calculates how many FVC tokens user should receive
4. Contract creates vesting schedule for user
5. Contract transfers USDC from user to treasury
6. Contract mints FVC tokens to user (locked in vesting)

#### **Code Flow**
```solidity
function bond(uint256 usdcAmount) external nonReentrant {
    // 1. Input validation
    if (usdcAmount == 0) revert Bonding__AmountMustBeGreaterThanZero();
    if (!privateSaleActive) revert Bonding__PrivateSaleNotActive();
    
    // 2. Check milestone and calculate FVC amount
    Milestone storage currentMilestoneData = milestones[currentMilestone];
    uint256 fvcAmount = _calculatePreciseFVCAmount(usdcAmount, currentMilestoneData.price);
    
    // 3. Update state BEFORE external calls (security pattern)
    totalBonded = totalBonded + usdcAmount;
    userBonded[msg.sender] = userBonded[msg.sender] + usdcAmount;
    
    // 4. Create vesting schedule
    _vestingSchedules[msg.sender] = VestingSchedule({
        startTime: block.timestamp,
        cliffEndTime: block.timestamp + CLIFF_DURATION,
        endTime: block.timestamp + CLIFF_DURATION + VESTING_DURATION,
        totalAmount: fvcAmount,
        claimedAmount: 0
    });
    
    // 5. External calls AFTER state updates
    usdc.safeTransferFrom(msg.sender, treasury, usdcAmount);
    fvc.mint(msg.sender, fvcAmount);
    
    // 6. Emit event for frontend
    emit BondCreated(msg.sender, usdcAmount, fvcAmount);
}
```

#### **Why Each Step Matters**

**Input Validation**:
- Prevents invalid operations that could break the system
- `usdcAmount == 0` would waste gas and create empty vesting schedules
- `!privateSaleActive` prevents bonding when sale is closed

**State Updates Before External Calls**:
- **Reentrancy Protection**: Prevents recursive attacks
- **State Consistency**: Ensures contract state is always accurate
- **Gas Efficiency**: Updates happen before expensive external calls

**Vesting Schedule Creation**:
- Locks tokens for 12 months (cliff period)
- Then gradually releases over 24 months (linear vesting)
- Prevents immediate dumping of tokens

### **Step 3: Milestone Progression**

#### **What Happens**
1. After each bond, `_updateCurrentMilestone()` is called
2. Contract checks if current milestone threshold has been reached
3. If threshold reached, contract advances to next milestone
4. New milestone has higher FVC price (lower tokens per USDC)

#### **Code Flow**
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

#### **Why This Matters**
- **Fair Pricing**: Early supporters get better rates
- **Capital Efficiency**: Maximizes fundraising while maintaining token value
- **User Psychology**: Creates urgency and FOMO

### **Step 4: Vesting Schedule Management**

#### **What Happens**
1. User's FVC tokens are locked in vesting schedule
2. During cliff period (0-12 months): 0% tokens accessible
3. During vesting period (12-36 months): Linear progression to 100%
4. User can check vested amount at any time

#### **Code Flow**
```solidity
function _calculateVestedAmount(VestingSchedule storage schedule) internal view returns (uint256) {
    if (block.timestamp < schedule.cliffEndTime) {
        return 0; // Still in cliff period
    }
    
    if (block.timestamp >= schedule.endTime) {
        return schedule.totalAmount; // Fully vested
    }
    
    // Linear vesting calculation
    uint256 timeSinceCliff = block.timestamp - schedule.cliffEndTime;
    uint256 vestingDuration = schedule.endTime - schedule.cliffEndTime;
    
    return (schedule.totalAmount * timeSinceCliff) / vestingDuration;
}
```

#### **Why This Matters**
- **Token Lock**: Prevents immediate selling and price manipulation
- **Long-term Alignment**: Users are incentivized to hold and participate in governance
- **Regulatory Compliance**: Standard vesting schedule for private sales

---

## 🧪 **Testing Strategy**

### **1. Understanding Test Structure**

#### **Basic Test Pattern**
```typescript
describe("Bonding Functionality", function () {
  let bonding: Bonding;
  let fvc: FVC;
  let usdc: MockUSDC;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  
  beforeEach(async function () {
    // Setup fresh contracts for each test
    [owner, user1] = await ethers.getSigners();
    
    // Deploy contracts
    fvc = await FVC.deploy("FVC", "FVC", owner.address);
    bonding = await upgrades.deployProxy(Bonding, [await fvc.getAddress(), await usdc.getAddress(), treasuryAddress]);
    
    // Grant roles
    const minterRole = await fvc.getMinterRole();
    await fvc.grantRole(minterRole, await bonding.getAddress());
  });
  
  it("Should allow user to bond USDC for FVC tokens", async function () {
    // Arrange: Set up test conditions
    const usdcAmount = ethers.parseUnits("1000", 6);
    const expectedFVC = (usdcAmount * ethers.parseEther("1")) / BigInt(25 * 1000);
    
    // Act: Execute the function
    await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
    await bonding.connect(user1).bond(usdcAmount);
    
    // Assert: Verify the result
    expect(await fvc.balanceOf(user1.address)).to.equal(expectedFVC);
  });
});
```

#### **Why This Structure Matters**
- **beforeEach**: Fresh state for each test (prevents interference)
- **Arrange-Act-Assert**: Clear test organization
- **Isolation**: Each test is independent

### **2. Key Testing Concepts**

#### **Time Manipulation**
```typescript
// Move to specific time for vesting tests
const targetTime = startTime + (18 * 30 * 24 * 60 * 60); // 18 months
await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
await ethers.provider.send("evm_mine", []);

// Check vesting at that time
const (vestedAmount, totalAmount) = await bonding.getVestedAmount(user1.address);
expect(vestedAmount).to.be.closeTo(totalAmount * 25n / 100n, totalAmount / 100n); // 25% vested
```

**Why This Matters**:
- Vesting is time-based, so tests need to manipulate time
- `evm_setNextBlockTimestamp` sets exact time
- `evm_mine` creates new block at that time

#### **BigInt Handling**
```typescript
// Correct way to handle large numbers
const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC with 6 decimals
const expectedFVC = (usdcAmount * ethers.parseEther("1")) / BigInt(25 * 1000);

// Wrong way (will cause errors)
const expectedFVC = (usdcAmount * 1e18) / (25 * 1000); // Mixing types
```

**Why This Matters**:
- Solidity uses uint256 (very large integers)
- JavaScript has precision limits with regular numbers
- BigInt handles large numbers correctly

### **3. Running Tests Effectively**

#### **Command Line Options**
```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/bonding.test.ts

# Run specific test by name
npx hardhat test --grep "Should allow user to bond"

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage
```

#### **Debugging Failed Tests**
```typescript
// Add console.log for debugging
console.log("User USDC balance:", await usdc.balanceOf(user1.address));
console.log("Expected FVC:", expectedFVC.toString());
console.log("Actual FVC:", (await fvc.balanceOf(user1.address)).toString());

// Use hardhat console for interactive debugging
await hre.console.log("Debug info:", someVariable);
```

---

## 🔍 **Debugging Techniques**

### **1. Common Error Types**

#### **Constructor Errors**
```typescript
// Error: missing argument: types/values length mismatch
// This means constructor expects different parameters
const fvc = await FVC.deploy("FVC", "FVC", owner.address); // Correct
const fvc = await FVC.deploy(owner.address); // Wrong - missing name and symbol
```

#### **Access Control Errors**
```typescript
// Error: AccessControl: account [address] is missing role [role]
// This means contract doesn't have required permission
const minterRole = await fvc.getMinterRole();
await fvc.grantRole(minterRole, await bonding.getAddress()); // Grant permission
```

#### **Type Errors**
```typescript
// Error: Cannot mix BigInt and other types
// Convert to same type before operation
const result = Number(saleEndTime) + 1; // Convert BigInt to Number first
```

### **2. Debugging Strategies**

#### **Step-by-Step Verification**
```typescript
it("Should work correctly", async function () {
  // Step 1: Verify initial state
  console.log("Initial total bonded:", (await bonding.totalBonded()).toString());
  
  // Step 2: Execute function
  await bonding.connect(user1).bond(usdcAmount);
  
  // Step 3: Verify state changes
  console.log("Final total bonded:", (await bonding.totalBonded()).toString());
  
  // Step 4: Verify user state
  console.log("User bonded amount:", (await bonding.userBonded(user1.address)).toString());
});
```

#### **Event Verification**
```typescript
// Check if events were emitted correctly
await expect(bonding.connect(user1).bond(usdcAmount))
  .to.emit(bonding, "BondCreated")
  .withArgs(user1.address, usdcAmount, expectedFVC);
```

---

## 🚀 **Extension Patterns**

### **1. Adding New Features Safely**

#### **Pattern: New Function with Access Control**
```solidity
// Add new admin function
function updateMilestonePrice(uint256 milestoneIndex, uint256 newPrice) 
    external 
    onlyRole(BONDING_MANAGER_ROLE) 
{
    require(milestoneIndex < milestones.length, "Invalid milestone");
    milestones[milestoneIndex].price = newPrice;
    emit MilestonePriceUpdated(milestoneIndex, newPrice);
}
```

#### **Pattern: New View Function**
```solidity
// Add new read-only function
function getUserVestingInfo(address user) 
    external 
    view 
    returns (
        uint256 startTime,
        uint256 cliffEndTime,
        uint256 endTime,
        uint256 totalAmount,
        uint256 claimedAmount,
        uint256 vestedAmount
    ) 
{
    VestingSchedule storage schedule = _vestingSchedules[user];
    return (
        schedule.startTime,
        schedule.cliffEndTime,
        schedule.endTime,
        schedule.totalAmount,
        schedule.claimedAmount,
        _calculateVestedAmount(schedule)
    );
}
```

### **2. Testing New Features**

#### **Test Template for New Functions**
```typescript
describe("New Feature", function () {
  it("Should work correctly for valid inputs", async function () {
    // Arrange
    const validInput = someValue;
    
    // Act
    await contract.newFunction(validInput);
    
    // Assert
    expect(await contract.someState()).to.equal(expectedValue);
  });
  
  it("Should revert for invalid inputs", async function () {
    // Arrange
    const invalidInput = invalidValue;
    
    // Act & Assert
    await expect(contract.newFunction(invalidInput))
      .to.be.revertedWithCustomError(contract, "ErrorName");
  });
  
  it("Should emit correct events", async function () {
    // Arrange
    const input = someValue;
    
    // Act & Assert
    await expect(contract.newFunction(input))
      .to.emit(contract, "EventName")
      .withArgs(expectedArgs);
  });
});
```

---

## 📋 **Daily Development Workflow**

### **Morning Routine**
1. **Check Test Status**: `npx hardhat test` to ensure all tests pass
2. **Review Recent Changes**: `git log --oneline -5` to see what you've been working on
3. **Plan Today's Tasks**: Focus on one feature at a time

### **Development Process**
1. **Write Test First**: Define expected behavior before implementing
2. **Implement Feature**: Write the actual contract code
3. **Run Tests**: Ensure new feature works and doesn't break existing code
4. **Commit Changes**: `git add . && git commit -m "implements [feature name]"`

### **Debugging Process**
1. **Identify the Problem**: What's not working as expected?
2. **Check Test Output**: Look for specific error messages
3. **Add Debug Logs**: Use `console.log` to trace execution
4. **Verify Assumptions**: Check if your understanding of the code is correct
5. **Fix and Test**: Make changes and run tests again

### **Before Committing**
1. **All Tests Pass**: `npx hardhat test` shows no failures
2. **Code Review**: Read through your changes
3. **Documentation**: Update comments if needed
4. **Commit Message**: Clear description of what you implemented

---

## 🎯 **Mastery Checklist**

### **Week 1: Foundation**
- [ ] Can explain how the bonding process works end-to-end
- [ ] Can run tests and understand what they're testing
- [ ] Can identify basic error types and fix them
- [ ] Can explain why each function exists in the contract

### **Week 2: Deep Understanding**
- [ ] Can modify contract parameters safely
- [ ] Can add new view functions without breaking existing code
- [ ] Can debug test failures independently
- [ ] Can explain the security patterns used

### **Week 3: Extension**
- [ ] Can add new features to the bonding system
- [ ] Can write comprehensive tests for new features
- [ ] Can optimize gas usage for common operations
- [ ] Can explain the economic model and incentives

### **Week 4: Mastery**
- [ ] Can design new contract features from scratch
- [ ] Can audit code for security vulnerabilities
- [ ] Can optimize the entire system for performance
- [ ] Can mentor other developers on the codebase

---

## 🚨 **Common Pitfalls to Avoid**

### **1. State Update Order**
```solidity
// WRONG: External calls before state updates
function badFunction() external {
    externalContract.call(); // External call first
    stateVariable = newValue; // State update after
}

// CORRECT: State updates before external calls
function goodFunction() external {
    stateVariable = newValue; // State update first
    externalContract.call(); // External call after
}
```

### **2. Access Control**
```solidity
// WRONG: No access control
function adminFunction() external {
    // Anyone can call this!
}

// CORRECT: Proper access control
function adminFunction() external onlyRole(ADMIN_ROLE) {
    // Only admins can call this
}
```

### **3. Input Validation**
```solidity
// WRONG: No input validation
function processAmount(uint256 amount) external {
    // Could be 0 or very large numbers
}

// CORRECT: Proper input validation
function processAmount(uint256 amount) external {
    require(amount > 0, "Amount must be greater than 0");
    require(amount <= MAX_AMOUNT, "Amount exceeds maximum");
}
```

---

## 📚 **Resources for Further Learning**

### **Solidity Documentation**
- [Solidity Docs](https://docs.soliditylang.org/) - Official language reference
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/) - Security library you're using

### **Hardhat Documentation**
- [Hardhat Docs](https://hardhat.org/docs/) - Development framework
- [Ethers.js Docs](https://docs.ethers.org/) - Blockchain interaction library

### **DeFi Security**
- [Consensys Diligence](https://consensys.net/diligence/) - Security best practices
- [DeFi Safety](https://defisafety.com/) - Protocol security ratings

---

## 🎉 **You're Ready!**

By following this guide, you'll become the **expert developer** on your own codebase. You'll understand:

- **How the bonding system works** from user perspective to smart contract execution
- **How to test effectively** and debug issues independently  
- **How to extend the system** safely with new features
- **How to maintain security** and follow best practices

**Remember**: The best way to learn is by doing. Start with small changes, test thoroughly, and gradually build your confidence. You've already got a solid foundation - now it's time to master it!

**Next Steps**:
1. **Read through this guide** completely
2. **Run the existing tests** to see them in action
3. **Make a small change** (like adding a new view function)
4. **Test your change** thoroughly
5. **Commit your work** and celebrate your progress!

You've got this! 🚀
