# FVC Protocol - Smart Contract Testing Guide

## Overview

This directory contains comprehensive tests for the FVC Protocol smart contracts. Our testing philosophy follows industry best practices used by successful DeFi protocols like Aerodrome, Uniswap, and Compound.

## Testing Philosophy

### Why We Test (Not Just How)

**Security First**: Smart contracts handle real money. Every function must be tested for edge cases, reentrancy attacks, and mathematical precision.

**User Trust**: Users stake their capital in our protocol. Comprehensive testing ensures their funds are safe and the protocol behaves as expected.

**Regulatory Compliance**: Proper testing demonstrates due diligence and helps with audits and regulatory requirements.

**Cost Prevention**: Bugs in production can cost millions. Testing catches issues before they reach mainnet.

**Team Confidence**: Developers can refactor and deploy with confidence knowing the test suite validates all functionality.

## Contract Architecture

### End-to-End Bonding Process

The FVC Protocol bonding system consists of these core contracts:

1. **FVC.sol** - ERC20 governance token
   - **Purpose**: Represents ownership and voting rights in the protocol
   - **Why Non-Upgradeable**: Governance tokens must be immutable to maintain trust
   - **Key Functions**: `mint()`, `transfer()`, `transferFrom()` with vesting checks

2. **Bonding.sol** - Main bonding contract (UUPS upgradeable)
   - **Purpose**: Manages USDC → FVC token sales with milestone-based pricing
   - **Why Upgradeable**: Bonding logic may need updates based on market conditions
   - **Key Functions**: `bond()`, `startPrivateSale()`, `endPrivateSale()`

3. **Interfaces** - Define contract interactions
   - **IBonding.sol** - Bonding contract interface
   - **IFVC.sol** - FVC token interface

### Data Flow

```
User → USDC Approval → Bonding.bond() → FVC.mint() → Vesting Schedule Created
  ↓
USDC → Treasury Address
  ↓
FVC Tokens → User (Locked in Vesting)
  ↓
12-Month Cliff → 24-Month Linear Vesting → Fully Unlocked
```

## Test Structure

### File Organization

```
test/
├── bonding.test.ts          # Core bonding functionality
├── fvc.test.ts             # FVC token functionality  
├── vesting.test.ts         # Vesting mechanics
├── vesting-mechanics.test.ts # Comprehensive vesting tests
├── utils/
│   └── vesting-helpers.ts  # Test utilities
└── README.md               # This file
```

### Test Categories

#### 1. **Initialization Tests**
- **Why**: Ensure contracts deploy with correct state
- **What**: Constructor parameters, role assignments, initial values
- **Example**: `Should initialize with correct parameters`

#### 2. **Core Functionality Tests**
- **Why**: Validate main business logic works correctly
- **What**: Bonding, pricing, milestone progression
- **Example**: `Should allow user to bond USDC for FVC tokens`

#### 3. **Access Control Tests**
- **Why**: Prevent unauthorized access to admin functions
- **What**: Role-based permissions, admin-only functions
- **Example**: `Should not allow non-manager to start private sale`

#### 4. **Edge Case Tests**
- **Why**: Catch unexpected scenarios that could break the protocol
- **What**: Zero amounts, invalid addresses, boundary conditions
- **Example**: `Should not allow bonding with zero amount`

#### 5. **Mathematical Precision Tests**
- **Why**: Ensure calculations are accurate and don't lose precision
- **What**: Price calculations, vesting percentages, token amounts
- **Example**: `Should maintain precision in calculations`

#### 6. **Security Tests**
- **Why**: Prevent common attack vectors
- **What**: Reentrancy, overflow, access control bypasses
- **Example**: Circuit breaker functionality, emergency shutdown

## Running Tests

### Basic Test Execution

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/bonding.test.ts

# Run specific test by description
npx hardhat test --grep "Should allow user to bond USDC"

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test
```

### Test Isolation

Each test runs in isolation using Hardhat's `beforeEach` hook:

```typescript
beforeEach(async function () {
  // Fresh contract deployments for each test
  // Clean state prevents test interference
});
```

### Time Manipulation

For vesting tests, we use Hardhat's time manipulation:

```typescript
// Move to specific timestamp
await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
await ethers.provider.send("evm_mine", []);

// Why not evm_increaseTime? It accumulates across tests, causing isolation issues
```

## Industry Standard Test Patterns

### 1. **Arrange-Act-Assert Pattern**

```typescript
it("Should calculate correct FVC amount", async function () {
  // Arrange: Set up test conditions
  const usdcAmount = ethers.parseUnits("1000", 6);
  const expectedFVC = ethers.parseEther("40000"); // 1000 USDC / $0.025
  
  // Act: Execute the function
  const calculatedFVC = await bonding.calculateFVCAmount(usdcAmount);
  
  // Assert: Verify the result
  expect(calculatedFVC).to.equal(expectedFVC);
});
```

### 2. **Comprehensive Error Testing**

```typescript
it("Should revert with correct error", async function () {
  // Test that specific custom errors are thrown
  await expect(
    bonding.connect(user1).bond(0)
  ).to.be.revertedWithCustomError(bonding, "Bonding__AmountMustBeGreaterThanZero");
});
```

### 3. **Event Emission Testing**

```typescript
it("Should emit correct event", async function () {
  const usdcAmount = ethers.parseUnits("1000", 6);
  
  await expect(bonding.connect(user1).bond(usdcAmount))
    .to.emit(bonding, "Bonded")
    .withArgs(user1Address, usdcAmount, expectedFVC, 0);
});
```

### 4. **State Change Verification**

```typescript
it("Should update state correctly", async function () {
  const initialBalance = await fvc.balanceOf(user1Address);
  const usdcAmount = ethers.parseUnits("1000", 6);
  
  await bonding.connect(user1).bond(usdcAmount);
  
  const finalBalance = await fvc.balanceOf(user1Address);
  expect(finalBalance).to.be.gt(initialBalance);
});
```

## Vesting Mechanics Deep Dive

### Why 12-Month Cliff + 24-Month Linear?

**Cliff Period (0-12 months)**: 
- **Purpose**: Prevents immediate token dumping
- **Why**: Protects early investors and maintains price stability
- **Industry Standard**: Used by 80% of successful DeFi protocols

**Linear Vesting (12-36 months)**:
- **Purpose**: Gradual token release to align incentives
- **Why**: Encourages long-term participation and reduces selling pressure
- **Industry Standard**: Balances liquidity with commitment

### Vesting Calculation Logic

```solidity
function _calculateVestedAmount(VestingSchedule storage schedule) internal view returns (uint256) {
    uint256 currentTime = block.timestamp;
    uint256 cliffEndTime = schedule.startTime + CLIFF_DURATION_SECONDS; // 12 months
    uint256 vestingEndTime = cliffEndTime + VESTING_DURATION_SECONDS;   // 24 months
    
    // During cliff: 0% vested
    if (currentTime < cliffEndTime) return 0;
    
    // After cliff: linear progression
    if (currentTime >= vestingEndTime) return schedule.amount; // 100% vested
    
    // Calculate linear percentage
    uint256 vestingProgress = currentTime - cliffEndTime;
    uint256 vestingDuration = VESTING_DURATION_SECONDS;
    
    return (schedule.amount * vestingProgress) / vestingDuration;
}
```

## Milestone Pricing Structure

### Why Progressive Pricing?

**Early Bird Incentive**: Lower prices reward early supporters
**Market Alignment**: Prices increase as demand grows
**Capital Efficiency**: Maximizes fundraising while maintaining token value

### Milestone Breakdown

```
Early Bird:    0-416,667 USDC → $0.025 per FVC
Early Adopters: 416,667-833,333 USDC → $0.05 per FVC  
Growth:         833,333-1,250,000 USDC → $0.075 per FVC
Final:          1,250,000-20,000,000 USDC → $0.10 per FVC
```

## Security Features

### 1. **Circuit Breaker Pattern**
- **Why**: Emergency halt mechanism for critical issues
- **Implementation**: `activateCircuitBreaker()` function
- **Usage**: Halts all bonding operations immediately

### 2. **Reentrancy Protection**
- **Why**: Prevents recursive function calls
- **Implementation**: OpenZeppelin's `ReentrancyGuard`
- **Usage**: All external calls in `bond()` function

### 3. **Access Control**
- **Why**: Restricts admin functions to authorized addresses
- **Implementation**: OpenZeppelin's `AccessControl`
- **Roles**: `BONDING_MANAGER_ROLE`, `EMERGENCY_ROLE`, `UPGRADER_ROLE`

### 4. **Precision Loss Protection**
- **Why**: Prevents mathematical errors from rounding
- **Implementation**: `_validatePrecision()` function
- **Tolerance**: 0.01% maximum precision loss

## Creating New Tests

### Test Template

```typescript
describe("New Feature", function () {
  it("Should perform expected behavior", async function () {
    // Arrange: Set up test conditions
    const input = "test value";
    
    // Act: Execute the function
    const result = await contract.function(input);
    
    // Assert: Verify the result
    expect(result).to.equal("expected output");
  });
  
  it("Should handle edge case", async function () {
    // Test boundary conditions and error cases
    await expect(
      contract.function("invalid input")
    ).to.be.revertedWithCustomError(contract, "CustomError");
  });
});
```

### Test Naming Convention

- **Positive cases**: `Should [expected behavior]`
- **Negative cases**: `Should not [unexpected behavior]`  
- **Error cases**: `Should revert when [condition]`
- **Edge cases**: `Should handle [edge case scenario]`

## Continuous Integration

### Automated Testing

```yaml
# .github/workflows/test.yml
name: Smart Contract Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx hardhat test
```

### Coverage Requirements

- **Line Coverage**: >95%
- **Function Coverage**: >98%
- **Branch Coverage**: >90%

## Debugging Tests

### Common Issues

1. **Test Isolation**: Ensure `beforeEach` resets state
2. **Time Manipulation**: Use `evm_setNextBlockTimestamp` not `evm_increaseTime`
3. **BigInt Operations**: Avoid mixing with regular numbers
4. **Contract Deployment**: Verify constructor parameters match

### Debug Commands

```bash
# Run single test with verbose output
npx hardhat test --grep "test name" --verbose

# Run with console.log output
npx hardhat test --grep "test name" --no-compile

# Debug specific test
npx hardhat test --grep "test name" --timeout 0
```

## Future Testing Roadmap

### Phase 1: Core Functionality ✅
- [x] Bonding mechanics
- [x] Vesting calculations
- [x] Access control
- [x] Error handling

### Phase 2: Advanced Features
- [ ] Circuit breaker testing
- [ ] Emergency shutdown scenarios
- [ ] Multi-user stress tests
- [ ] Gas optimization tests

### Phase 3: Integration Testing
- [ ] Frontend integration tests
- [ ] Cross-contract interaction tests
- [ ] Real-world scenario simulations

## Contributing

### Adding New Tests

1. **Understand the requirement**: What function/feature needs testing?
2. **Follow the pattern**: Use existing test structure and naming
3. **Test comprehensively**: Cover happy path, edge cases, and errors
4. **Document**: Add comments explaining complex test logic
5. **Verify**: Ensure tests pass and provide value

### Test Review Checklist

- [ ] Tests cover all code paths
- [ ] Edge cases are tested
- [ ] Error conditions are validated
- [ ] Tests are isolated and repeatable
- [ ] Naming follows conventions
- [ ] Documentation is clear

## Resources

- [Hardhat Testing Guide](https://hardhat.org/tutorial/testing-contracts)
- [OpenZeppelin Test Helpers](https://docs.openzeppelin.com/test-helpers/)
- [Chai Assertion Library](https://www.chaijs.com/api/)
- [Ethereum Testing Best Practices](https://ethereum.org/en/developers/docs/smart-contracts/testing/)

---

**Remember**: Good tests don't just verify that code works - they document how the system should behave and catch regressions before they reach production.
