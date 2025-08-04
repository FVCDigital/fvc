# FVC Protocol

First Venture Capital Protocol - DeFi's first interest-free, community-governed protocol for venture capital and business grants.

## Overview

FVC Protocol provides the solution small Web3 businesses have been waiting for: access to capital. Instead of giving away 30% equity for $200k, receive funding through community governance. The community that funds you becomes your biggest supporters.

## Token Architecture

- **$FVC**: Governance, fixed supply, tradeable, staking rewards

## Core Features

- **Bonding**: Purchase $FVC at a premium through USDC bonding
- **Staking**: Stake $FVC to earn more FVC tokens and protocol fees
- **Governance**: Vote on startup funding and protocol parameters
- **KYC Integration**: FCA-compliant identity verification
- **Revenue Sharing**: Earn from successful startup investments

## Technology Stack

- **Smart Contracts**: Solidity, OpenZeppelin, Hardhat
- **Frontend**: Next.js, TypeScript, TailwindCSS
- **Blockchain**: Polygon, Ethereum
- **Wallet Integration**: RainbowKit, Wagmi

## Development

```bash
# Install dependencies
yarn install

# Start development
yarn workspace dapp dev

# Test contracts
yarn workspace contracts test

# Deploy contracts
yarn workspace contracts deploy
```

## Documentation

- [Litepaper](./docs/litepaper.pdf)
- [Technical Architecture](./docs/architecture.md)
- [Smart Contract Documentation](./contracts/README.md)
