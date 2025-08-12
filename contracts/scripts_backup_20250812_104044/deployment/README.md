# Deployment Scripts

Scripts for deploying contracts to testnet and mainnet.

## Scripts

### `deploy-mock-usdc.ts`
Deploys a mock USDC token for testing purposes.
- **Purpose**: Creates a test USDC token on Amoy testnet
- **Usage**: `npx hardhat run scripts/deployment/deploy-mock-usdc.ts --network amoy`
- **Output**: Mock USDC contract address

### `deploy-bonding-with-mock-usdc.ts`
Deploys FVC and Bonding contracts using the mock USDC.
- **Purpose**: Deploys the complete bonding system with mock USDC
- **Usage**: `npx hardhat run scripts/deployment/deploy-bonding-with-mock-usdc.ts --network amoy`
- **Output**: FVC and Bonding contract addresses, updates frontend contracts

## Usage

```bash
# Deploy mock USDC first
npx hardhat run scripts/deployment/deploy-mock-usdc.ts --network amoy

# Then deploy bonding system
npx hardhat run scripts/deployment/deploy-bonding-with-mock-usdc.ts --network amoy
``` 