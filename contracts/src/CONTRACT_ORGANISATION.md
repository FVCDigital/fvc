# FVC Protocol Contract Organization

## ✅ COMPLETED: Professional Organization

### Current Structure
```
contracts/src/
├── core/
│   ├── FVC.sol                    # Main FVC token with vesting
│   └── Bonding.sol                # Main bonding contract (renamed from BondingV2)
├── interfaces/
│   ├── IBonding.sol
│   └── IFVC.sol
├── libraries/
│   └── BondingMath.sol
├── testnet/
│   ├── FVCUnlocked.sol            # Testnet FVC without vesting
│   └── EmergencyUnlocker.sol      # Testnet emergency utility
├── mocks/
│   ├── MockFVC.sol
│   └── MockUSDC.sol
└── legacy/
    └── Bonding.sol                # Old deprecated version
```

## ✅ COMPLETED: Changes Made

1. **Renamed BondingV2.sol → Bonding.sol** (main contract)
2. **Moved files to organized directories**
3. **Updated all import paths**
4. **Updated deployment scripts**
5. **Renamed deployment script** (deploy-bonding-v2.ts → deploy-bonding.ts)

## Audit Recommendations

### For auditfirst.io, upload these files:

**Primary Contracts (Required):**
1. `contracts/src/core/FVC.sol` - Main token contract
2. `contracts/src/core/Bonding.sol` - Main bonding contract
3. `contracts/src/interfaces/IBonding.sol` - Bonding interface
4. `contracts/src/interfaces/IFVC.sol` - FVC interface
5. `contracts/src/libraries/BondingMath.sol` - Math library

**Do NOT audit:**
- `contracts/src/legacy/Bonding.sol` - Deprecated version
- `contracts/src/testnet/` - Testnet utilities only
- `contracts/src/mocks/` - Testing contracts only

## Benefits Achieved

1. **Clear Naming**: Bonding.sol is now the main contract (no confusing V2)
2. **Professional Structure**: Core, interfaces, libraries, testnet separated
3. **Easy Maintenance**: Clear where to find each contract type
4. **Audit Efficiency**: Only audit relevant contracts
5. **Version Control**: Legacy contracts archived separately

## Next Steps

1. ✅ **COMPLETED**: Create new directory structure
2. ✅ **COMPLETED**: Move files to appropriate directories
3. ✅ **COMPLETED**: Update all import paths
4. ✅ **COMPLETED**: Update deployment scripts
5. **UPLOAD TO AUDIT**: Upload only core contracts to auditfirst.io
6. **REMOVE LEGACY**: Delete legacy Bonding.sol after confirming new Bonding.sol works

## Deployment Commands

```bash
# Deploy main contracts
npx hardhat run scripts/deployment/deploy-bonding.ts --network amoy
npx hardhat run scripts/deployment/deploy-fvc.ts --network amoy

# Deploy testnet utilities (if needed)
npx hardhat run scripts/deployment/deploy-mocks.ts --network amoy
```
