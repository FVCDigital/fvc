# Debugging Scripts

Scripts for debugging contract issues and verifying functionality.

## Scripts

### `check-bonding-state.ts`
Checks the current state of the bonding contract.
- **Purpose**: Verify bonding contract configuration and progress
- **Usage**: `npx hardhat run scripts/debugging/check-bonding-state.ts --network amoy`
- **Output**: Round info, discount, caps, total bonded

### `check-bonding-details.ts`
Detailed analysis of user's bonding activity.
- **Purpose**: Debug user bonding transactions and FVC calculations
- **Usage**: `npx hardhat run scripts/debugging/check-bonding-details.ts --network amoy`
- **Output**: User bonded amount, expected vs actual FVC

### `check-new-bonding-state.ts`
Checks newly deployed bonding contract state.
- **Purpose**: Verify new bonding contract after redeployment
- **Usage**: `npx hardhat run scripts/debugging/check-new-bonding-state.ts --network amoy`
- **Output**: Fresh contract state and calculation tests

### `debug-bonding-transaction.ts`
Comprehensive bonding transaction analysis.
- **Purpose**: Debug specific bonding transaction issues
- **Usage**: `npx hardhat run scripts/debugging/debug-bonding-transaction.ts --network amoy`
- **Output**: Detailed transaction analysis and decimal debugging

### `test-bonding-calculation.ts`
Tests the bonding calculation logic.
- **Purpose**: Verify FVC calculation accuracy
- **Usage**: `npx hardhat run scripts/debugging/test-bonding-calculation.ts --network amoy`
- **Output**: Calculation tests and decimal analysis

### `test-usdc-approval.ts`
Tests USDC approval functionality.
- **Purpose**: Verify USDC approval works correctly
- **Usage**: `npx hardhat run scripts/debugging/test-usdc-approval.ts --network amoy`
- **Output**: Approval test results

## Usage

```bash
# Check bonding contract state
npx hardhat run scripts/debugging/check-bonding-state.ts --network amoy

# Debug user bonding issues
npx hardhat run scripts/debugging/check-bonding-details.ts --network amoy

# Test USDC approval
npx hardhat run scripts/debugging/test-usdc-approval.ts --network amoy
```

## Debugging Workflow

1. Use `check-bonding-state.ts` to verify contract state
2. Use `test-usdc-approval.ts` if approval issues occur
3. Use `check-bonding-details.ts` to debug user transactions
4. Use `test-bonding-calculation.ts` to verify calculations 