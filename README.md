# First Venture Capital

This repository contains the smart contracts and frontend application for the FVC protocol, a community-governed system for funding SMEs and startups through interest-free grants, revenue-sharing agreements, and equity arrangements on Ethereum.

Token holders vote on which businesses receive funding and earn USDC from the revenues those businesses generate. Governance uses quadratic voting. Compliance is enforced on-chain via KYC whitelisting.

## Contracts

| Contract | Description |
|---|---|
| `FVC.sol` | ERC-20 governance token, 1B supply cap, role-gated mint/burn, UUPS upgradeable |
| `Sale.sol` | Fixed-price token sale accepting USDC/USDT, mints on demand, sends proceeds to treasury |
| `Staking.sol` | Synthetix proportional staking. Stake FVC, earn USDC from SME revenue repayments |
| `Vesting.sol` | Token vesting schedules for team and investor allocations |
| `FVCFaucet.sol` | Testnet-only faucet |

All contracts are in `contracts/src/`. Treasury operations are managed through a 3-of-5 Gnosis Safe multisig.

## Repository Structure

```
contracts/       Solidity contracts (Hardhat)
dapp/            Next.js frontend
packages/        Shared TypeScript types and utilities
subgraph/        TheGraph indexing
docs/            Whitepaper and token sale terms
```

## Development

**Prerequisites:** Node.js 18+, Yarn

```bash
# Install dependencies
yarn install

# Run the dapp locally
yarn workspace dapp dev

# Compile contracts
cd contracts && npx hardhat compile

# Run contract tests
cd contracts && npx hardhat test

# Deploy to Ethereum Sepolia
cd contracts && npx hardhat run scripts/deployment/deploy.ts --network sepolia
```

## Networks

The protocol is deployed on Ethereum mainnet. Sepolia is used for testing.

## Documentation

- [Whitepaper](./docs/Whitepaper.pdf)
- [Token Sale Terms](./docs/FVC_Token_Sale_Terms_and_Conditions.pdf)
- [GitBook](https://github.com/FVCDigital/fvc-gitbook)
- [Website](https://fvcdigital.com)

## License

MIT — see [LICENSE](./LICENSE).
