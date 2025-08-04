# Utility Scripts

General utility scripts for contract inspection and analysis.

## Scripts

### `check-treasury.ts`
Checks treasury address and USDC balance.
- **Purpose**: Verify where bonded USDC goes
- **Usage**: `npx hardhat run scripts/utilities/check-treasury.ts --network amoy`
- **Output**: Treasury address and USDC balance

### `check-user-fvc.ts`
Checks user's FVC balance and vesting status.
- **Purpose**: Verify user's FVC tokens and vesting
- **Usage**: `npx hardhat run scripts/utilities/check-user-fvc.ts --network amoy`
- **Output**: FVC balance, vesting schedule, lock status

### `check-bonding-transaction.ts`
Analyzes bonding transaction details.
- **Purpose**: Comprehensive bonding transaction analysis
- **Usage**: `npx hardhat run scripts/utilities/check-bonding-transaction.ts --network amoy`
- **Output**: Transaction analysis, balances, calculations

### `check-transaction-history.ts`
Checks transaction history for user.
- **Purpose**: Analyze user's transaction history
- **Usage**: `npx hardhat run scripts/utilities/check-transaction-history.ts --network amoy`
- **Output**: Recent transactions and bonding events

## Usage

```bash
# Check treasury status
npx hardhat run scripts/utilities/check-treasury.ts --network amoy

# Check user's FVC balance
npx hardhat run scripts/utilities/check-user-fvc.ts --network amoy

# Analyze bonding transaction
npx hardhat run scripts/utilities/check-bonding-transaction.ts --network amoy
```

## Utility Workflow

1. Use `check-treasury.ts` to verify treasury functionality
2. Use `check-user-fvc.ts` to verify user token balances
3. Use `check-bonding-transaction.ts` for transaction analysis
4. Use `check-transaction-history.ts` for historical analysis 