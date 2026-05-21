# Testing Guidelines

Testing standards and best practices for the FVC project, derived from UZH Effective Software Testing course (Spring 2026).

## Table of Contents
1. [Test Doubles](#test-doubles)
2. [When to Mock](#when-to-mock)
3. [Integration Testing](#integration-testing)
4. [Test-Driven Development (TDD)](#test-driven-development-tdd)
5. [Test Code Quality](#test-code-quality)
6. [Practical Examples](#practical-examples)

---

## Test Doubles

### Types of Test Doubles

| Type | Purpose | Example |
|------|---------|---------|
| **Stub** | Returns prepared answers when called | "If `getPrice()` is called, return 100" |
| **Mock** | Returns prepared answers AND verifies interactions | Same as stub + "was `send()` called once with the right invoice?" |
| **Fake** | Simpler but working implementation | In-memory repository instead of real database |
| **Spy** | Wraps real object, lets it run, records calls | Real behavior + tracking |
| **Dummy** | Placeholder object to satisfy parameters | Test doesn't actually use it |

### Quick Memory Trick
- **Stub** = answers only
- **Mock** = answers + checks calls  
- **Fake** = simpler real thing
- **Spy** = real behavior + tracking

### Stubbing vs Mocking

**Use stubbing** when you only care about output/state:
```typescript
// Stub example - we only care about the return value
mockPriceOracle.getPrice.mockReturnValue(100);
const result = sale.calculateCost(10);
expect(result).toBe(1000);
```

**Use mocking** when the interaction itself is part of the requirement:
```typescript
// Mock example - we care that send() was called correctly
await emailService.sendConfirmation(user);
expect(mockMailer.send).toHaveBeenCalledWith(user.email, expect.any(String));
expect(mockMailer.send).toHaveBeenCalledTimes(1);
```

**Why not always mock?**
- More interaction checks = more brittle tests
- Tests become coupled to implementation details ("how" code works), not behavior ("what" it achieves)
- Refactors can break tests even when behavior is still correct

**Rule of thumb:**
- Default to stub + state/output assertions
- Add mock interaction verification only for interactions that truly matter to correctness

---

## When to Mock

### Mock These (Slow, External, Hard-to-Control)
- Database connections
- External API calls (blockchain RPC, price feeds, MoonPay)
- File system operations
- Network requests
- Time-dependent operations

### Do NOT Mock These
- Simple entities/value objects (e.g., `Product`, `Invoice`)
- Standard library classes
- Everything by default
- Third-party APIs directly (prefer an adapter first)

### Mocking the "Unmockable"

For static calls, current time, and third-party APIs:
1. **Inject dependencies** instead of creating them inside methods
2. **Add wrappers** for time/static/global APIs
3. **Add adapters** around third-party libraries and mock the adapters
4. Keep pure logic in small classes without heavy dependencies

**Strategy:** Introduce a wrapper/adapter you control, mock it in unit tests, verify the real integration separately.

---

## Integration Testing

### Core Principles

1. **Real databases for SQL integration tests**
   - Use a test database exclusively for tests
   - NEVER run tests against production database

2. **Clean state between tests**
   - Tests must clean up the database
   - Database should contain only the bare minimum data for the test to start
   - Tests fail for reasons other than bugs if state leaks

3. **Proper infrastructure is key**
   - Integration and system tests require decent infrastructure behind the scenes
   - Without it, too much time is spent on setup or assertions

### Test Pyramid Strategy

> "Exercise everything at the unit level (you can easily cover entire requirements and structures at the unit level), and exercise the most important behavior in larger tests."

```
        /\
       /  \  E2E Tests (critical paths only)
      /----\
     /      \ Integration Tests (real boundaries)
    /--------\
   /          \ Unit Tests (business logic, fast, isolated)
  --------------
```

### When Integration Tests Are Essential

1. **Database interactions** - SQL queries, ORM mappings
2. **External service contracts** - API integrations, webhooks
3. **File system operations** - Read/write files
4. **Message queues** - Pub/sub systems

### Example: Blockchain Integration Test

```typescript
// Integration test - uses real contract on testnet
describe('Sale Contract Integration', () => {
  let sale: Sale;
  
  beforeAll(async () => {
    // Deploy to local hardhat network
    sale = await deploySaleContract();
  });

  it('should accept USDC payment and mint FVC', async () => {
    // Use real USDC approval and purchase flow
    await usdc.approve(sale.address, parseUnits('100', 6));
    await sale.buy(parseUnits('100', 6));
    
    const fvcBalance = await fvc.balanceOf(buyer.address);
    expect(fvcBalance).toBeGreaterThan(0);
  });
});
```

---

## Test-Driven Development (TDD)

### The TDD Cycle

1. **Write a failing test** (Red)
2. **Write minimal code to pass** (Green)
3. **Refactor** (Refactor)
4. Repeat

### TDD Steps Documentation

When implementing a feature with TDD, document each step:

```markdown
### Step 1 - Null input validation
**Test written:** `shouldThrowExceptionWhenCategoryIsNull()`
**Why:** Invalid input should fail before touching the data source
**Code written:** Added null check guard clause

### Step 2 - Empty input validation  
**Test written:** `shouldThrowExceptionWhenCategoryIsEmpty()`
**Why:** Empty string is not a valid filter
**Code change:** Guard already handles this case

### Step 3 - Happy path
**Test written:** `shouldReturnMatchingProducts()`
**Why:** Core functionality
**Code written:** Implemented filtering logic
```

### TDD Best Practices

- Start with boundary cases (null, empty, single item)
- Progress to happy paths
- Cover error handling
- Document your reasoning for each test

---

## Test Code Quality

### Principles (Chapter 10)

1. **Single Responsibility**
   - Each test exercises one specific behavior
   - One assertion per test (conceptually)

2. **No Duplication**
   - Shared setup in `@BeforeEach` / `beforeEach`
   - Use test factories for common objects

3. **Strong Assertions**
   - Use specific assertion libraries (AssertJ, Jest matchers)
   - Avoid generic `toBeTruthy()` when specific checks exist

4. **Boundary Cases**
   - Empty collections
   - Null/undefined inputs
   - Edge values (0, -1, max int)
   - Single vs multiple items

5. **Readable Test Names**
   ```typescript
   // Good
   it('should return empty list when no products match category')
   it('should throw when wallet address is invalid')
   
   // Bad
   it('test1')
   it('works')
   ```

### Avoid Pseudo-Tested Methods

> "Pseudo-tested methods happen in the wild... These methods are tested, but if we replace their entire implementation with a simple return null, tests still pass."

Ensure your tests would fail if the implementation is broken.

### Test Structure (AAA Pattern)

```typescript
describe('InvoiceFilter', () => {
  it('should filter invoices below threshold', () => {
    // Arrange
    const invoices = [
      createInvoice(50),
      createInvoice(150),
      createInvoice(99),
    ];
    const filter = new InvoiceFilter(mockRepo(invoices));
    
    // Act
    const result = filter.filterBelow(100);
    
    // Assert
    expect(result).toHaveLength(2);
    expect(result.map(i => i.amount)).toEqual([50, 99]);
  });
});
```

---

## Practical Examples

### Example 1: Testing with External API (MoonPay)

```typescript
// Unit test - mock the API
describe('useMoonPay hook', () => {
  const mockMoonPaySDK = jest.fn();
  
  beforeEach(() => {
    window.MoonPayWebSdk = mockMoonPaySDK;
  });

  it('should open widget with correct params for USDC', () => {
    const { openMoonPay } = renderHook(() => useMoonPay()).result.current;
    
    openMoonPay(100, 'USDC');
    
    expect(mockMoonPaySDK).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          currencyCode: 'usdc_ethereum',
          baseCurrencyAmount: '100',
        }),
      })
    );
  });
});
```

### Example 2: Testing Contract Interactions

```typescript
// Unit test - mock the contract
describe('Sale purchase flow', () => {
  const mockSaleContract = {
    buy: jest.fn(),
    getInvestorTerms: jest.fn(),
  };

  it('should call buy with correct USDC amount', async () => {
    mockSaleContract.buy.mockResolvedValue({ wait: () => Promise.resolve() });
    
    await purchaseWithUSDC(mockSaleContract, 100);
    
    expect(mockSaleContract.buy).toHaveBeenCalledWith(
      parseUnits('100', 6) // USDC has 6 decimals
    );
  });
});

// Integration test - real contract
describe('Sale contract (integration)', () => {
  it('should mint FVC tokens after USDC purchase', async () => {
    const initialBalance = await fvc.balanceOf(buyer.address);
    
    await usdc.approve(sale.address, parseUnits('100', 6));
    await sale.buy(parseUnits('100', 6));
    
    const finalBalance = await fvc.balanceOf(buyer.address);
    expect(finalBalance.sub(initialBalance)).toBeGreaterThan(0);
  });
});
```

### Example 3: Dependency Injection for Testability

```typescript
// Bad - hard to test
class PriceService {
  async getPrice() {
    const response = await fetch('https://api.coingecko.com/...');
    return response.json();
  }
}

// Good - injectable dependency
class PriceService {
  constructor(private fetcher: Fetcher = globalFetch) {}
  
  async getPrice() {
    const response = await this.fetcher('https://api.coingecko.com/...');
    return response.json();
  }
}

// In tests
const mockFetcher = jest.fn().mockResolvedValue({ json: () => ({ price: 100 }) });
const service = new PriceService(mockFetcher);
```

---

## Summary

| Scenario | Test Type | Use Doubles? |
|----------|-----------|--------------|
| Business logic | Unit | Yes (stub dependencies) |
| Contract calls | Unit + Integration | Unit: mock; Integration: real testnet |
| External APIs | Unit | Yes (mock adapter) |
| Database queries | Integration | No (use test database) |
| UI components | Unit | Yes (mock hooks/context) |
| E2E flows | System | No (real everything) |

**Golden Rules:**
1. Unit tests for speed and isolation
2. Integration tests for real boundaries
3. Mock what's slow, external, or hard to control
4. Don't mock what's simple or what you don't own directly
5. Every test should fail if implementation is broken
