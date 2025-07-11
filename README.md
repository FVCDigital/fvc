# FVC Protocol

## Overview
FVC Protocol is a modular, upgradeable Web3 infrastructure for compliant venture funding. It uses a fixed-supply ERC20 token (FVC) and supports scalable staking and bonding mechanisms, with a focus on regulatory compliance and upgradability.

## TL;DR by Technology

- **Hardhat**: An Ethereum-compatible blockchain development environment for compiling, testing, deploying, debug and upgrading smart contracts. Used for all contract workflows.
- **Node.js**: v18+ recommended (v23.x is not officially supported by Hardhat; use LTS for best results).
- **npm**: Node package manager for installing dependencies and managing scripts.
- **OpenZeppelin**: Industry-standard library for secure, upgradeable smart contracts (ERC20, Ownable, proxy pattern, etc.).
- **ERC20**: Standard for fungible tokens on Ethereum. FVC is a fixed-supply, upgradeable ERC20 token.
- **TypeChain**: Generates TypeScript typings for contracts, ensuring type-safe frontend/backend integration.

## Architecture

- **contracts/**: All Solidity smart contracts (FVC, Bonding, Staking, interfaces, libraries), upgradeable via OpenZeppelin proxies.
- **packages/shared/**: Shared TypeChain types, ABIs, and constants for use across contracts and frontend.
- **dapp/**: Next.js frontend (scaffolded, modular, ready for integration with contracts).

## Installation

### Prerequisites
- Node.js v18+ (LTS recommended)
- npm (comes with Node.js)
- Hardhat (installed via npm in contracts/)

### Setup
```bash
# Clone the repo
# Install dependencies in each package (e.g., contracts/)
cd contracts
npm install
```

## Usage

### Compile Contracts
```bash
cd contracts
npx hardhat compile
```

### Test/Deploy Contracts
- See deployment scripts and test folders in `contracts/` (to be expanded as protocol evolves).

## Tokenomics (Current State)
- **FVC Token**: 1,000,000,000 fixed supply, upgradeable ERC20.
- **Bonding/Staking**: Minimal, upgradeable contracts scaffolded for future logic.

## Security & Upgradability
- All contracts use OpenZeppelin's proxy pattern for safe upgrades.
- Modular structure for easy audits and future compliance/governance integration.

## Roadmap
- [x] Directory scaffolding and contract architecture
- [x] Upgradeable ERC20, Bonding, Staking contracts
- [ ] Governance, Compliance, and advanced logic
- [ ] Frontend integration and demo

## Contributing
- Follow modular structure and export conventions.
- Use TypeChain for type safety.
- Do not commit node_modules or .env files.

## License
MIT
