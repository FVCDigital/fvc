# Testing Scripts

Scripts for testing contract functionality and user interactions.

## Scripts

### `mint-usdc-to-user.ts`
Mints test USDC tokens to the user's wallet.
- **Purpose**: Provides test USDC for bonding experiments
- **Usage**: `npx hardhat run scripts/testing/mint-usdc-to-user.ts --network amoy`
- **Output**: 1,000 USDC minted to deployer address

### `mint-more-usdc.ts`
Mints additional USDC tokens for extended testing.
- **Purpose**: Provides more test USDC for larger bonding tests
- **Usage**: `npx hardhat run scripts/testing/mint-more-usdc.ts --network amoy`
- **Output**: 50,000 USDC minted to deployer address

## Usage

```bash
# Mint initial test USDC
npx hardhat run scripts/testing/mint-usdc-to-user.ts --network amoy

# Mint more USDC for extended testing
npx hardhat run scripts/testing/mint-more-usdc.ts --network amoy
```

## Testing Workflow

1. Deploy contracts using deployment scripts
2. Mint test USDC using testing scripts
3. Test bonding functionality through frontend
4. Use debugging scripts to verify results 