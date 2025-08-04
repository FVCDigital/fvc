# Scripts Directory

Organized scripts for FVC Protocol development and testing.

## Directory Structure

```
scripts/
├── deployment/     # Contract deployment scripts
├── testing/        # Testing and minting scripts
├── debugging/      # Debug and verification scripts
└── utilities/      # General utility scripts
```

## Quick Start

### 1. Deploy Contracts
```bash
# Deploy mock USDC
npx hardhat run scripts/deployment/deploy-mock-usdc.ts --network amoy

# Deploy bonding system
npx hardhat run scripts/deployment/deploy-bonding-with-mock-usdc.ts --network amoy
```

### 2. Mint Test USDC
```bash
# Mint initial test USDC
npx hardhat run scripts/testing/mint-usdc-to-user.ts --network amoy

# Mint more USDC for extended testing
npx hardhat run scripts/testing/mint-more-usdc.ts --network amoy
```

### 3. Debug Issues
```bash
# Check bonding state
npx hardhat run scripts/debugging/check-bonding-state.ts --network amoy

# Test USDC approval
npx hardhat run scripts/debugging/test-usdc-approval.ts --network amoy

# Check user FVC balance
npx hardhat run scripts/utilities/check-user-fvc.ts --network amoy
```

## Script Categories

### Deployment Scripts
- Contract deployment to testnet
- Address updates for frontend
- Configuration verification

### Testing Scripts
- Test USDC minting
- User interaction testing
- Extended testing scenarios

### Debugging Scripts
- Contract state verification
- Transaction debugging
- Calculation verification
- Approval testing

### Utility Scripts
- Treasury inspection
- User balance checking
- Transaction analysis
- Historical data

## Current Contract Addresses

- **Mock USDC**: `0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb`
- **FVC Token**: `0x8Bf97817B8354b960e26662c65F9d0b3732c9057`
- **Bonding Contract**: `0x0C81CCEB47507a1F030f13002325a6e8A99953E9`
- **Treasury**: `0xcABa97a2bb6ca2797e302C864C37632b4185d595`

## Testing Workflow

1. **Deploy** contracts using deployment scripts
2. **Mint** test USDC using testing scripts
3. **Test** bonding through frontend
4. **Debug** issues using debugging scripts
5. **Verify** results using utility scripts 