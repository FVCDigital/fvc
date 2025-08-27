# FVC Protocol

A decentralized protocol for venture capital and business grants built on Polygon, featuring interest-free funding through community governance.

## 🚀 Quick Start

```bash
# Install dependencies
yarn install

# Run the dapp
sudo yarn workspace dapp dev

# Deploy contracts to Polygon Amoy testnet
cd contracts
npx hardhat run scripts/deployment/deploy-bonding.ts --network amoy
```

## 📁 Project Structure

```
fvc-protocol/
├── contracts/          # Solidity smart contracts
│   ├── src/
│   │   ├── core/      # FVC token & bonding contracts
│   │   ├── sale/      # Private sale & vesting system
│   │   ├── staking/   # Staking & rewards
│   │   ├── governance/ # DAO & voting
│   │   ├── compliance/ # KYC & AML
│   │   └── treasury/  # Vault management
│   └── scripts/       # Deployment & testing
├── dapp/              # Next.js frontend
├── packages/shared/   # Shared types & utilities
└── subgraph/         # TheGraph indexing
```

## 🏗️ Core Contracts

- **FVC.sol** - Main governance token with vesting
- **Bonding.sol** - Bonding curve for stablecoin exchange
- **SaleAdmin.sol** - Private sale round management
- **VestingVault.sol** - Token vesting schedules
- **FVCGovernor.sol** - DAO governance system

## 🎯 Key Features

- **Interest-free funding** through community governance
- **Bonding curves** for stablecoin liquidity
- **Staking rewards** at 8-12% APY
- **Private sale rounds** with KYC compliance
- **6-month vesting** for investor tokens

## 🔧 Development

### Prerequisites
- Node.js 18+
- Yarn 4.9.2+
- Hardhat
- MetaMask or similar wallet

### Commands
```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to testnet
npx hardhat run scripts/deployment/deploy-bonding.ts --network amoy

# Start local node
npx hardhat node
```

## 🌐 Networks

- **Polygon Amoy** - Testnet (default)
- **Polygon Mainnet** - Production (when ready)

## 📚 Documentation

- [Protocol Rules](./FVC_PROTOCOL_RULES.md)
- [File Layout](./FVC_FILE_LAYOUT.txt)
- [Development Timeline](./FVC_PROTOCOL_DEVELOPMENT_TIMELINE.md)
- [Contract Organisation](./contracts/src/CONTRACT_ORGANISATION.md)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file.

---

**Note:** This is the development repository. For comprehensive documentation, see the links above.
