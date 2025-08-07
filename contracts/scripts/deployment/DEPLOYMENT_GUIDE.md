# FVC Protocol Deployment Guide

This guide provides a step-by-step process for a clean testnet reset and redeployment of the FVC Protocol.

## Prerequisites

- Node.js and npm installed
- Hardhat configured for your target network (Polygon Amoy testnet)
- Wallet with testnet tokens for gas fees
- Environment variables set up (private key, RPC URL, etc.)

## Step 1: Redeploy Contracts

### Option A: Deploy FVC Token Only (if needed)

If you want a fresh FVC token contract:

```bash
cd contracts
npx hardhat run scripts/deployment/deploy-fvc.js --network amoy
```

**Note:** Update the admin address in the script to your wallet address.

### Option B: Deploy Both FVC and Bonding (Recommended)

This deploys both contracts and sets up the initial configuration:

```bash
cd contracts
npx hardhat run scripts/deployment/deploy-bonding.js --network amoy
```

This script will:
- Deploy FVC token with admin role
- Deploy Bonding contract with Round 0 configuration
- Grant MINTER_ROLE to bonding contract
- Set bonding contract in FVC token
- Write contract addresses to dapp files

## Step 2: Update Addresses

After deployment, update the contract addresses in:

### A. Update Debugging Scripts

Update these files with your new contract addresses:

- `contracts/scripts/debugging/set-fvc-bonding-contract.js`
- `contracts/scripts/debugging/allocate-fvc.js`
- `contracts/scripts/debugging/start-new-round.js`
- `contracts/scripts/debugging/mint-fvc-to-admin.js`
- `contracts/scripts/debugging/setup-new-deployment.js`
- `contracts/scripts/debugging/check-deployment-status.js`

### B. Update dApp Configuration

The deployment scripts automatically update:
- `dapp/src/utils/contracts/fvc.ts`
- `dapp/src/utils/contracts/bonding.ts`

### C. Update Main Contract Configuration

Update `dapp/src/utils/contracts/bondingContract.ts`:

```typescript
export const TESTNET_CONTRACTS = {
  BONDING: 'YOUR_NEW_BONDING_ADDRESS',
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  FVC: 'YOUR_NEW_FVC_ADDRESS',
};
```

## Step 3: Run Setup Scripts

### Option A: Run Complete Setup (Recommended)

This runs all setup steps in the correct order:

```bash
cd contracts
npx hardhat run scripts/debugging/setup-new-deployment.js --network amoy
```

This script will:
1. Set bonding contract in FVC
2. Start a new round
3. Mint FVC to admin wallet
4. Allocate FVC to bonding contract
5. Display final status

### Option B: Run Individual Scripts

If you prefer to run steps individually:

```bash
# 1. Set bonding contract in FVC
npx hardhat run scripts/debugging/set-fvc-bonding-contract.js --network amoy

# 2. Start new round
npx hardhat run scripts/debugging/start-new-round.js --network amoy

# 3. Mint FVC to admin
npx hardhat run scripts/debugging/mint-fvc-to-admin.js --network amoy

# 4. Allocate FVC to bonding
npx hardhat run scripts/debugging/allocate-fvc.js --network amoy
```

## Step 4: Verify Deployment

Check that everything is working correctly:

```bash
cd contracts
npx hardhat run scripts/debugging/check-deployment-status.js --network amoy
```

This will show:
- Contract addresses and configurations
- Token balances
- Round status
- Permissions
- Overall deployment readiness

## Step 5: Test the UI

1. Start your dApp:
```bash
cd dapp
npm run dev
```

2. Verify the TradingCard shows:
   - FVC Allocated
   - FVC Bought
   - FVC Remaining
   - Current discount

3. Test bonding functionality:
   - Connect wallet
   - Enter USDC amount
   - Execute bond transaction
   - Verify stats update

## Configuration Details

### Round 0 Configuration (Soft Launch)
- **Initial Discount:** 20% (1 USDC = 1.25 FVC = $0.80)
- **Final Discount:** 10% (1 USDC = 1.11 FVC = $0.90)
- **Epoch Cap:** 10M FVC tokens
- **Wallet Cap:** 1M FVC tokens per wallet
- **Vesting Period:** 90 days

### Target Price Range
- **Start:** $0.80 per FVC
- **End:** $0.90 per FVC
- **Target:** $1.00 per FVC

## Troubleshooting

### Common Issues

1. **"Insufficient balance" errors**
   - Run the mint script to get more FVC tokens
   - Check USDC balance for gas fees

2. **"Contract not found" errors**
   - Verify contract addresses are correct
   - Check network configuration

3. **"Role not granted" errors**
   - Run the setup script to grant necessary roles
   - Check if admin has DEFAULT_ADMIN_ROLE

4. **"Round not active" errors**
   - Start a new round using the start-new-round script
   - Check round configuration

### Verification Commands

```bash
# Check contract verification
npx hardhat verify --network amoy CONTRACT_ADDRESS

# Check contract balance
npx hardhat run scripts/debugging/check-bonding-balance.js --network amoy

# Check transaction status
npx hardhat run scripts/debugging/check-bonding-transaction.ts --network amoy
```

## Clean Up (Optional)

After successful deployment, you can:

1. **Archive old addresses** to avoid confusion
2. **Update documentation** with new contract addresses
3. **Test all functionality** before announcing deployment

## Security Notes

- Keep private keys secure
- Use testnet for development
- Verify all transactions before mainnet deployment
- Test thoroughly before production use

---

**Ready to deploy?** Follow the steps above for a clean, working testnet setup!
