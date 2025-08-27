# 🚀 FVC Protocol - Amoy Testnet Deployment Checklist

## 📋 Pre-Deployment Checklist

### ✅ Smart Contract Verification
- [ ] Bonding contract compiles without errors
- [ ] FVC token contract compiles without errors  
- [ ] Mock USDC contract compiles without errors
- [ ] All contracts pass basic functionality tests

### ✅ Network Configuration
- [ ] Amoy network configured in `hardhat.config.ts`
- [ ] RPC URL accessible: `https://polygon-amoy.drpc.org`
- [ ] Chain ID: `80002`
- [ ] Gas price: `50 gwei` (configurable)

### ✅ Environment Setup
- [ ] `.env` file created with required variables
- [ ] `PRIVATE_KEY` set (deployer wallet)
- [ ] `AMOY_RPC_URL` set (optional, uses default if not set)
- [ ] Deployer wallet has sufficient testnet ETH

### ✅ Wallet Preparation
- [ ] Deployer wallet has at least `0.1 ETH` for deployment
- [ ] Treasury wallet address identified
- [ ] Test user wallets prepared for testing

## 🚀 Deployment Process

### Step 1: Deploy Contracts
```bash
# Deploy to Amoy testnet
npx hardhat run scripts/deploy-bonding-amoy.ts --network amoy
```

**Expected Output:**
- ✅ FVC Token deployed
- ✅ Mock USDC deployed  
- ✅ Bonding Contract deployed
- ✅ All contracts initialized
- ✅ Private sale started

### Step 2: Save Contract Addresses
After successful deployment, save these addresses:
- **FVC Token**: `0x...`
- **Mock USDC**: `0x...`
- **Bonding Contract**: `0x...`

### Step 3: Update Test Scripts
Update the contract addresses in:
- `scripts/test-bonding-amoy.ts`
- `scripts/test-vesting-amoy.ts`

## 🧪 Testing Process

### Phase 1: Basic Functionality
```bash
# Test bonding functionality
npx hardhat run scripts/test-bonding-amoy.ts --network amoy
```

**Test Results:**
- [ ] User can bond USDC for FVC
- [ ] Vesting schedule created correctly
- [ ] Tokens are properly locked
- [ ] Contract state updated correctly
- [ ] Milestone progression working

### Phase 2: Vesting Verification
```bash
# Test vesting functionality
npx hardhat run scripts/test-vesting-amoy.ts --network amoy
```

**Test Results:**
- [ ] Vesting schedule created correctly
- [ ] Cliff period enforced (0% vested)
- [ ] Linear vesting calculation working
- [ ] Token transfer restrictions enforced
- [ ] Vesting percentages accurate

### Phase 3: Long-term Testing
- [ ] Monitor vesting progression over time
- [ ] Verify 12-month cliff period
- [ ] Test 24-month linear vesting
- [ ] Verify milestone progression
- [ ] Test token transfers after vesting

## 📊 Milestone Structure Verification

### Early Bird (Milestone 0)
- **Price**: $0.025 per FVC
- **USDC Threshold**: 0 → 416,667 USDC
- **FVC Allocation**: 16,666,667 FVC
- **Status**: ✅ Active

### Early Adopters (Milestone 1)  
- **Price**: $0.05 per FVC
- **USDC Threshold**: 416,667 → 833,333 USDC
- **FVC Allocation**: 16,666,667 FVC
- **Status**: ✅ Active

### Growth (Milestone 2)
- **Price**: $0.075 per FVC
- **USDC Threshold**: 833,333 → 1,250,000 USDC
- **FVC Allocation**: 16,666,667 FVC
- **Status**: ✅ Active

### Final (Milestone 3)
- **Price**: $0.10 per FVC
- **USDC Threshold**: 1,250,000 → 20,000,000 USDC
- **FVC Allocation**: 175,000,000 FVC
- **Status**: ✅ Active

## 🔍 Contract Verification

### Bonding Contract Functions
- [ ] `bond(uint256 usdcAmount)` - User bonding
- [ ] `getCurrentPrice()` - Current milestone price
- [ ] `getCurrentMilestone()` - Current milestone info
- [ ] `getAllMilestones()` - All milestone data
- [ ] `getVestingSchedule(address user)` - User vesting
- [ ] `isLocked(address user)` - Token lock status
- [ ] `getVestedAmount(address user)` - Vested tokens

### Access Control
- [ ] `BONDING_MANAGER_ROLE` - Manage bonding parameters
- [ ] `UPGRADER_ROLE` - Upgrade contract
- [ ] `DEFAULT_ADMIN_ROLE` - Grant/revoke roles

### Vesting Schedule
- [ ] **Cliff Period**: 12 months (0% vested)
- [ ] **Linear Vesting**: 24 months (0% → 100%)
- [ ] **Total Duration**: 36 months
- [ ] **Token Locking**: Prevents transfers during vesting

## 🚨 Emergency Procedures

### Pause Guardian
- [ ] Emergency pause functionality working
- [ ] Guardian roles properly assigned
- [ ] Pause duration limits enforced

### Upgrade Mechanism
- [ ] UUPS upgrade pattern implemented
- [ ] Upgrade authorization working
- [ ] State preservation during upgrades

## 📈 Performance Monitoring

### Gas Usage
- [ ] Bonding transaction: < 500,000 gas
- [ ] Vesting check: < 50,000 gas
- [ ] Milestone update: < 100,000 gas

### Transaction Success Rate
- [ ] Deployment: 100%
- [ ] Bonding: > 95%
- [ ] Vesting operations: > 99%

## 🔗 Useful Links

### Amoy Testnet
- **RPC URL**: `https://polygon-amoy.drpc.org`
- **Chain ID**: `80002`
- **Explorer**: `https://amoy.polygonscan.com`
- **Faucet**: `https://faucet.polygon.technology`

### Contract Verification
- **FVC**: `https://amoy.polygonscan.com/address/{FVC_ADDRESS}`
- **USDC**: `https://amoy.polygonscan.com/address/{USDC_ADDRESS}`
- **Bonding**: `https://amoy.polygonscan.com/address/{BONDING_ADDRESS}`

## 📝 Post-Deployment Tasks

### Documentation
- [ ] Update contract addresses in documentation
- [ ] Record deployment transaction hashes
- [ ] Document any deployment issues/solutions

### Testing Schedule
- [ ] **Week 1**: Basic functionality verification
- [ ] **Week 2**: Milestone progression testing
- [ ] **Month 1**: Vesting schedule validation
- [ ] **Month 3**: Cliff period verification
- [ ] **Month 6**: Linear vesting progression
- [ ] **Month 12**: Full vesting completion

### Community Testing
- [ ] Share contract addresses with testers
- [ ] Provide testing instructions
- [ ] Collect feedback and bug reports
- [ ] Monitor testnet activity

## 🎯 Success Criteria

### Deployment Success
- [ ] All contracts deployed successfully
- [ ] No compilation or deployment errors
- [ ] All initialization functions completed
- [ ] Private sale started and active

### Functionality Success
- [ ] Users can bond USDC for FVC
- [ ] Milestone progression works correctly
- [ ] Vesting schedules created properly
- [ ] Token locking enforced correctly

### Long-term Success
- [ ] 12-month cliff period enforced
- [ ] 24-month linear vesting accurate
- [ ] Milestone progression smooth
- [ ] No critical bugs discovered

---

**🚀 Ready for Amoy Testnet Deployment!**

**Next Steps:**
1. Run deployment script
2. Save contract addresses
3. Test basic functionality
4. Begin long-term vesting verification
5. Monitor milestone progression
