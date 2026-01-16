# BSC Testnet Deployment & Testing Guide

This guide covers deploying and testing the FVC token sale on BSC Testnet, and how it translates to mainnet.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deploy to BSC Testnet](#deploy-to-bsc-testnet)
3. [Configure Frontend](#configure-frontend)
4. [Test the Flow](#test-the-flow)
5. [Translate to Mainnet](#translate-to-mainnet)
6. [Verification](#verification)

---

## Prerequisites

### 1. Get BSC Testnet BNB

You need BNB for gas fees on testnet:

- **Faucet:** https://testnet.bnbchain.org/faucet-smart
- **Amount needed:** ~0.5 BNB (for deployments + tests)

### 2. Get Testnet USDC/USDT

The deployment script will automatically deploy Mock USDC/USDT tokens if you don't provide addresses.

If you want to use official testnet stablecoins:
- Check BSC Testnet faucets
- Or use the deployed Mock tokens (recommended for testing)

### 3. Setup Environment Variables

Create/update `contracts/.env`:

```bash
DEPLOYER_PRIVATE_KEY=your_private_key_here
TREASURY_ADDRESS=your_gnosis_safe_or_wallet_address
```

---

## Deploy to BSC Testnet

### Step 1: Install Dependencies

```bash
cd /home/steak/Desktop/fvc/contracts
npm install
# or
yarn install
```

### Step 2: Deploy Contracts

```bash
yarn hardhat run scripts/deploy-bsc-testnet.ts --network bsc-testnet
```

This script will:
- ✅ Deploy FVC token (1B cap, 18 decimals)
- ✅ Deploy Sale contract ($0.025 per FVC)
- ✅ Deploy Vesting contract (180 day cliff, 730 day vesting for >$50k purchases)
- ✅ Deploy Mock USDC & USDT (if needed)
- ✅ Configure Sale: accept USDC/USDT, set vesting params
- ✅ Grant MINTER_ROLE to Sale & Vesting
- ✅ Activate sale
- ✅ Save addresses to `deployments-bsc-testnet.json`

### Step 3: Save Contract Addresses

The script outputs addresses like:

```
FVC Token:      0x1234...
Sale Contract:  0x5678...
Vesting:        0x9abc...
USDC:           0xdef0...
USDT:           0x1111...
```

---

## Configure Frontend

### Step 1: Update Laravel .env

Edit `app-extracted/.env` and add:

```bash
# BSC Testnet (Chain ID: 97)
BSC_CHAIN_ID=97
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# Contract Addresses (from deployment output)
BSC_FVC_ADDRESS=0x...
BSC_SALE_ADDRESS=0x...
BSC_VESTING_ADDRESS=0x...
BSC_USDC_ADDRESS=0x...
BSC_USDT_ADDRESS=0x...

# Sale Config
BSC_SALE_RATE=25000  # $0.025 per FVC (in 6 decimal format)
BSC_SALE_CAP=1000000 # $1M cap
```

### Step 2: Update Frontend Config

The config is injected via Blade template. Ensure `resources/views/site/buy-fvc.blade.php` includes:

```php
<script>
window.fvcConfig = {
    apiBase: '{{ config('app.url') }}/api',
    chainId: {{ config('services.bsc.chain_id', 97) }},
    saleContractAddress: '{{ config('services.bsc.sale_address') }}',
    fvcAddress: '{{ config('services.bsc.fvc_address') }}',
    usdcAddress: '{{ config('services.bsc.usdc_address') }}',
    usdtAddress: '{{ config('services.bsc.usdt_address') }}',
};
</script>
```

---

## Test the Flow

### Step 1: Setup MetaMask for BSC Testnet

Add BSC Testnet to MetaMask:
- **Network Name:** BSC Testnet
- **RPC URL:** `https://data-seed-prebsc-1-s1.binance.org:8545`
- **Chain ID:** `97`
- **Symbol:** `BNB`
- **Block Explorer:** `https://testnet.bscscan.com`

### Step 2: Get Test Tokens

If using Mock USDC/USDT:

1. The deployer already minted 1M USDC & 1M USDT to deployer address
2. Transfer some to your test wallet:

```bash
# In contracts directory
yarn hardhat console --network bsc-testnet

# In console:
const MockStable = await ethers.getContractFactory("MockStable");
const usdc = MockStable.attach("USDC_ADDRESS_FROM_DEPLOYMENT");
await usdc.mint("YOUR_TEST_WALLET", ethers.parseUnits("10000", 6)); // 10k USDC
```

### Step 3: Test Purchase Flow

1. **Visit:** `http://localhost:8000/buy-fvc`
2. **Step 1:** Connect MetaMask (should prompt to switch to BSC Testnet)
3. **Step 2:** Choose "USDC / USDT" (crypto option)
4. **Step 3:** 
   - Select USDC or USDT
   - Enter amount (e.g., 100)
   - Click "Purchase FVC Tokens"
   - **Approve:** MetaMask will prompt to approve USDC/USDT spend
   - **Purchase:** MetaMask will prompt to confirm purchase transaction
5. **Step 4:** Success! Check transaction on BSCScan Testnet

### Step 4: Verify Purchase

#### Check on BSCScan:
- Go to: `https://testnet.bscscan.com/tx/YOUR_TX_HASH`
- Verify:
  - ✅ USDC/USDT transferred from you to Treasury
  - ✅ FVC minted to your wallet (or Vesting contract if >$50k)

#### Check in Database:
```bash
cd app-extracted
php artisan tinker

# In tinker:
\App\Models\Purchase::latest()->first()
```

#### Check FVC Balance:
```javascript
// In browser console on /buy-fvc page
const fvc = new ethers.Contract(
    window.fvcConfig.fvcAddress,
    ['function balanceOf(address) view returns (uint256)'],
    new ethers.providers.Web3Provider(window.ethereum)
);
const balance = await fvc.balanceOf('YOUR_WALLET');
console.log('FVC Balance:', ethers.utils.formatEther(balance));
```

---

## Translate to Mainnet

Everything you test on testnet works **identically** on mainnet. Only these values change:

### Changes Required:

| Item | Testnet | Mainnet |
|------|---------|---------|
| **Network** | `bsc-testnet` | `bsc-mainnet` |
| **Chain ID** | `97` | `56` |
| **RPC URL** | `https://data-seed-prebsc-1-s1.binance.org:8545` | `https://bsc-dataseed1.binance.org` |
| **USDC Address** | Mock or testnet USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |
| **USDT Address** | Mock or testnet USDT | `0x55d398326f99059fF775485246999027B3197955` |
| **Block Explorer** | `https://testnet.bscscan.com` | `https://bscscan.com` |

### Mainnet Deployment:

```bash
# 1. Update .env with mainnet RPC and deployer key (with real BNB!)
DEPLOYER_PRIVATE_KEY=your_mainnet_private_key
TREASURY_ADDRESS=your_gnosis_safe_address  # IMPORTANT: Use Safe, not EOA

# 2. Set mainnet stablecoin addresses
BSC_MAINNET_USDC=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
BSC_MAINNET_USDT=0x55d398326f99059fF775485246999027B3197955

# 3. Deploy (same script, different network!)
yarn hardhat run scripts/deploy-bsc-testnet.ts --network bsc-mainnet

# 4. Transfer ownership to Gnosis Safe
yarn hardhat run scripts/transfer-ownership.ts --network bsc-mainnet
```

### Frontend Mainnet Config:

```bash
# app-extracted/.env
BSC_CHAIN_ID=56
BSC_RPC_URL=https://bsc-dataseed1.binance.org
BSC_USDC_ADDRESS=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
BSC_USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
# ... other addresses from mainnet deployment
```

---

## Verification

### Verify Contracts on BSCScan

```bash
# Testnet
yarn hardhat verify --network bsc-testnet FVC_ADDRESS "CONSTRUCTOR_ARGS"

# Mainnet
yarn hardhat verify --network bsc-mainnet FVC_ADDRESS "CONSTRUCTOR_ARGS"
```

### Security Checklist (Before Mainnet)

- [ ] Contract code audited by professional auditor
- [ ] Ownership transferred to Gnosis Safe (multisig)
- [ ] Sale rate/cap configured correctly
- [ ] Vesting parameters verified (cliff, duration, threshold)
- [ ] Real USDC/USDT addresses used
- [ ] Treasury address is Gnosis Safe (NOT EOA)
- [ ] Frontend points to correct mainnet contracts
- [ ] Rate limiting on backend API endpoints
- [ ] MoonPay production keys configured
- [ ] Ondato KYC integration tested

---

## Testing Checklist

### Testnet Tests:

- [ ] Deploy all contracts successfully
- [ ] Connect wallet to BSC Testnet
- [ ] Get test BNB from faucet
- [ ] Get test USDC/USDT (mock or faucet)
- [ ] Complete purchase flow (approve + buy)
- [ ] Verify FVC minted to wallet
- [ ] Check purchase recorded in database
- [ ] Test purchase < $50k (direct mint)
- [ ] Test purchase >= $50k (vesting)
- [ ] Verify vesting schedule created
- [ ] Test releasing vested tokens after cliff

### Edge Cases to Test:

- [ ] Insufficient balance (USDC/USDT)
- [ ] Insufficient allowance (should prompt approval)
- [ ] Wrong network (should prompt to switch)
- [ ] Transaction rejection (user denies in MetaMask)
- [ ] Sale inactive (disable via `setActive(false)`)
- [ ] Cap reached (buy when `raised >= cap`)
- [ ] Invalid token (try unsupported stablecoin)

---

## Troubleshooting

### "Transaction Reverted: Sale__Inactive"
**Solution:** Activate sale: `sale.setActive(true)` via Gnosis Safe or deployer

### "Insufficient Balance"
**Solution:** Mint more Mock USDC/USDT or get from faucet

### "Allowance Too Low"
**Solution:** Should auto-prompt approval. If not, manually approve:
```javascript
await usdc.approve(SALE_ADDRESS, ethers.parseUnits("1000000", 6))
```

### "Wrong Network"
**Solution:** Wizard should auto-prompt. Manual: Settings > Networks > BSC Testnet

### "Purchase Not Showing in Database"
**Solution:** 
1. Check `/api/purchases` endpoint is accessible
2. Check CSRF token in fetch request
3. Check Laravel logs: `tail -f storage/logs/laravel.log`

---

## Summary: Testnet → Mainnet

| Code | Testnet | Mainnet | Status |
|------|---------|---------|--------|
| **Smart Contracts** | Deployed to BSC Testnet | Deploy to BSC Mainnet | ✅ **Code Identical** |
| **Frontend JS** | Uses testnet config | Uses mainnet config | ✅ **Code Identical** |
| **Backend API** | Uses testnet addresses | Uses mainnet addresses | ✅ **Code Identical** |
| **Sale Logic** | `buy(stable, amount)` | `buy(stable, amount)` | ✅ **Code Identical** |
| **Vesting Logic** | 180d cliff, 730d vest | 180d cliff, 730d vest | ✅ **Code Identical** |

**Only environment variables and contract addresses change. All code stays the same.**

---

## Next Steps

1. ✅ Deploy to BSC Testnet
2. ✅ Test purchase flow end-to-end
3. ⏳ Integrate MoonPay (card payments)
4. ⏳ Integrate Ondato (KYC for crypto)
5. ⏳ Get smart contract audit
6. ⏳ Setup Gnosis Safe on mainnet
7. ⏳ Deploy to BSC Mainnet
8. ⏳ Transfer ownership to Safe
9. ⏳ Activate sale on mainnet
10. ⏳ Monitor transactions & purchases

---

**Questions?** Check:
- Contracts: `/home/steak/Desktop/fvc/contracts/`
- Frontend: `/home/steak/Desktop/fvc/app-extracted/resources/js/buy-fvc-wizard.js`
- Backend: `/home/steak/Desktop/fvc/app-extracted/routes/api.php`
- Deployment output: `contracts/deployments-bsc-testnet.json`
