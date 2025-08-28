# FVC Protocol - Smart Contracts

This directory contains the smart contracts for the FVC Protocol, implementing a milestone-based private sale bonding system with vesting mechanics.

## 🏗️ Project Structure

```
contracts/
├── src/                    # Source contracts
│   ├── core/              # Core protocol contracts
│   │   ├── Bonding.sol    # Main bonding contract
│   │   └── FVC.sol        # FVC token contract
│   ├── interfaces/        # Contract interfaces
│   └── mocks/             # Mock contracts for testing
├── test/                   # Test files (Hardhat)
│   ├── bonding.test.ts    # Bonding contract tests
│   ├── vesting.test.ts    # Vesting mechanics tests
│   ├── fvc.test.ts        # FVC token tests
│   ├── vesting-mechanics.test.ts  # Comprehensive vesting tests
│   └── utils/             # Test utilities
│       └── vesting-helpers.ts
├── scripts/                # Deployment scripts
│   ├── hardhat/           # Hardhat deployment scripts
│   │   ├── DeployBonding.ts  # Bonding system deployment
│   │   └── utils/         # Deployment utilities
│   └── foundry/           # Foundry deployment scripts (if using)
├── deploy/                 # Deployment artifacts
└── README.md              # This file
```

## 🎯 Core Contracts

### Bonding Contract
- **Purpose**: Manages USDC bonding for FVC tokens
- **Features**: 
  - 4 milestone pricing tiers
  - 12-month cliff + 24-month linear vesting
  - Treasury integration
  - UUPS upgradeability

### FVC Token
- **Purpose**: Protocol governance and utility token
- **Features**:
  - ERC-20 standard
  - Minting/burning capabilities
  - Vesting lock enforcement

## 🧪 Testing

### Run All Tests
```bash
npx hardhat test
```

### Run Specific Test Files
```bash
# Bonding tests
npx hardhat test test/bonding.test.ts

# Vesting mechanics tests
npx hardhat test test/vesting-mechanics.test.ts

# FVC token tests
npx hardhat test test/fvc.test.ts
```

### Test with Coverage
```bash
npx hardhat coverage
```

## 🚀 Deployment

### Local Development
```bash
# Deploy to local Hardhat network
npx hardhat run scripts/hardhat/DeployBonding.ts

# Deploy to local Anvil (Foundry)
forge script scripts/foundry/DeployBonding.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Testnet Deployment
```bash
# Deploy to Polygon Amoy testnet
npx hardhat run scripts/hardhat/DeployBonding.ts --network amoy

# Deploy to Polygon Mumbai testnet
npx hardhat run scripts/hardhat/DeployBonding.ts --network mumbai
```

### Mainnet Deployment
```bash
# Deploy to Polygon mainnet
npx hardhat run scripts/hardhat/DeployBonding.ts --network polygon

# Deploy to Ethereum mainnet
npx hardhat run scripts/hardhat/DeployBonding.ts --network mainnet
```

## 📋 Contract Addresses

### Polygon Amoy Testnet
- **FVC Token**: `0xA23e293B02EDc0a847b5215aE814CBc710f8c1B2`
- **Bonding Contract**: `0xF4b7B5D028C09E773b2df6087968872BB36856eA`
- **USDC**: `0x79a3c7c1459B4d68C39A6db2716C0f4BaE190dfc`
- **Treasury**: `0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9`

### Mainnet (TBD)
- **FVC Token**: TBD
- **Bonding Contract**: TBD
- **USDC**: TBD
- **Treasury**: TBD

## 🔧 Development

### Prerequisites
- Node.js 18+
- Yarn or npm
- Hardhat
- Foundry (optional)

### Setup
```bash
# Install dependencies
yarn install

# Compile contracts
npx hardhat compile

# Generate typechain types
npx hardhat typechain
```

### Environment Variables
Create a `.env` file:
```env
# Network RPC URLs
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_MAINNET_RPC_URL=https://polygon-rpc.com
ETHEREUM_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Private keys (for deployment)
DEPLOYER_PRIVATE_KEY=your_private_key_here
TREASURY_PRIVATE_KEY=treasury_private_key_here

# API keys
ETHERSCAN_API_KEY=your_etherscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key
```

## 📊 Vesting Mechanics

### Vesting Schedule
- **Cliff Period**: 12 months (0% tokens vested)
- **Linear Vesting**: 24 months (gradual token release)
- **Total Duration**: 36 months (3 years)

### Key Milestones
- **Month 12**: Cliff ends, 0% vested
- **Month 18**: 25% vested
- **Month 24**: 50% vested
- **Month 30**: 75% vested
- **Month 36**: 100% vested

### Mathematical Formula
```
if (currentTime < cliffEndTime) {
    vestedAmount = 0;
} else if (currentTime >= vestingEndTime) {
    vestedAmount = totalAmount;
} else {
    vestingProgress = currentTime - cliffEndTime;
    vestedAmount = (totalAmount * vestingProgress) / vestingDuration;
}
```

## 🔒 Security Features

- **Access Control**: Role-based permissions
- **Reentrancy Protection**: OpenZeppelin guards
- **UUPS Upgradeability**: Controlled contract upgrades
- **Input Validation**: Comprehensive parameter checks
- **Emergency Functions**: Admin controls for critical operations

## 📈 Milestone Structure

### Early Bird (0-416,667 USDC)
- **Price**: $0.025 per FVC
- **Allocation**: 16,666,667 FVC

### Early Adopters (416,667-833,333 USDC)
- **Price**: $0.05 per FVC
- **Allocation**: 16,666,667 FVC

### Growth (833,333-1,250,000 USDC)
- **Price**: $0.075 per FVC
- **Allocation**: 16,666,667 FVC

### Final (1,250,000-20,000,000 USDC)
- **Price**: $0.10 per FVC
- **Allocation**: 175,000,000 FVC

## 🚨 Important Notes

- **Never** run time manipulation scripts on mainnet
- **Always** verify contracts after deployment
- **Test thoroughly** before mainnet deployment
- **Monitor** vesting progress regularly
- **Backup** deployment artifacts

## 📞 Support

For technical questions or issues:
1. Check the test files for examples
2. Review the contract documentation
3. Consult the development team
4. Open an issue in the repository

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Status**: Ready for Testing
