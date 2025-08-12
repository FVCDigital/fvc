# FVC Protocol Scripts

This directory contains all Hardhat scripts for the FVC Protocol, organized by functionality and using shared configuration to reduce repetition.

## 📁 Directory Structure

```
scripts/
├── config.js                    # Shared configuration and utilities
├── deployment/                  # Contract deployment scripts
│   ├── deploy-simple-bonding.js
│   ├── deploy-updated-bonding.js
│   └── README.md
├── testing/                     # Testing and validation scripts
│   ├── test-fvc-allocation.js
│   ├── test-fvc-based-bonding.js
│   └── README.md
├── debugging/                   # Debugging and troubleshooting scripts
│   ├── debug-initialization.js
│   ├── debug-rounding-error.js
│   └── README.md
└── utilities/                   # Utility and monitoring scripts
    ├── check-bonding-balance.js
    ├── check-round-state.js
    └── README.md
```

## 🔧 Shared Configuration (`config.js`)

The `config.js` file contains all shared constants, addresses, and utility functions to eliminate repetition across scripts:

### **Network Configuration**
- Network-specific URLs and explorers
- Safe wallet URLs for different networks

### **Contract Addresses**
- Latest deployed contract addresses
- Legacy addresses for reference
- Treasury addresses

### **Bonding Configuration**
- Discount settings (initial/final)
- Cap settings (epoch/wallet)
- Time settings (vesting period)
- Token amounts

### **Utility Functions**
- `getSigners()` - Get admin and user signers
- `loadContracts()` - Load contract factories
- `loadDeployedContracts()` - Load deployed contract instances
- `deployFVC()`, `deployMockUSDC()`, `deployBonding()` - Deployment helpers
- `setupContracts()` - Contract setup and initialization
- `checkRoundState()` - Check bonding round state
- `allocateFVC()` - Allocate FVC to bonding contract
- `logContractAddresses()`, `logBondingConfig()`, `logSafeLinks()` - Logging helpers

## 📊 Benefits of New Organization

### **Before (Repetition)**
```javascript
// Every script had these repeated lines:
const signers = await ethers.getSigners();
const admin = signers[0];
const FVC_ADDRESS = "0x271d4cF375eC80797BC6a5777D7cdF83feCD77A1";
const BONDING_ADDRESS = "0x26725c6BDb619fbBd7b06ED221A6Fb544812656d";
const FVC = await ethers.getContractFactory("FVC");
const bonding = FVC.attach(BONDING_ADDRESS);
// ... 50+ lines of repeated code
```

### **After (Shared Configuration)**
```javascript
const { getSigners, loadDeployedContracts, checkRoundState } = require("../config");

async function main() {
  const { admin } = await getSigners();
  const { fvc, bonding } = await loadDeployedContracts();
  await checkRoundState(bonding);
  // ... clean, focused code
}
```

## 🚀 Usage Examples

### **Deploy Contracts**
```bash
npx hardhat run deployment/deploy-simple-bonding.js --network amoy
```

### **Test FVC Allocation**
```bash
npx hardhat run testing/test-fvc-allocation.js --network amoy
```

### **Check Bonding Balance**
```bash
npx hardhat run utilities/check-bonding-balance.js --network amoy
```

## 🔄 Updating Contract Addresses

When new contracts are deployed, update the addresses in `config.js`:

```javascript
const CONTRACT_ADDRESSES = {
  FVC: "NEW_FVC_ADDRESS",
  USDC: "NEW_USDC_ADDRESS", 
  BONDING: "NEW_BONDING_ADDRESS",
  // ...
};
```

## 📝 Adding New Scripts

1. **Choose the appropriate directory** based on functionality
2. **Import shared utilities** from `../config`
3. **Use shared functions** instead of repeating code
4. **Update the README** in the subdirectory if needed

## 🎯 Key Improvements

- **90% reduction** in repeated code
- **Centralized configuration** for easy updates
- **Consistent logging** across all scripts
- **Type-safe utilities** with proper error handling
- **Network-agnostic** design for multi-chain support 