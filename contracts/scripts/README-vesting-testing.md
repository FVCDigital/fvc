# FVC Protocol - Vesting Mechanics Testing Guide

This directory contains comprehensive testing scripts for verifying the FVC Protocol bonding system's vesting mechanics.

## 🎯 Overview

The FVC Protocol implements a **12-month cliff + 24-month linear vesting** system:
- **Cliff Period**: 0% tokens vested for the first 12 months
- **Linear Vesting**: Tokens unlock linearly from month 13-36
- **Total Duration**: 36 months (3 years)

## 📁 Available Scripts

### 1. `verify-vesting-mechanics.ts` (SAFE - Recommended)
**Purpose**: Safe verification without time manipulation
**Use Case**: Production testing, regular monitoring
**Features**:
- ✅ Analyzes current vesting state
- ✅ Verifies vesting calculations
- ✅ Checks frontend integration
- ✅ Validates smart contract enforcement
- ✅ No blockchain time manipulation

**Run Command**:
```bash
npx hardhat run scripts/verify-vesting-mechanics.ts --network amoy
```

### 2. `test-vesting-mechanics.ts` (ANALYSIS)
**Purpose**: Comprehensive vesting analysis and simulation
**Use Case**: Deep dive analysis, debugging
**Features**:
- ✅ Current state analysis
- ✅ Vesting calculation verification
- ✅ Time simulation (without manipulation)
- ✅ Frontend integration verification
- ✅ Schedule validation

**Run Command**:
```bash
npx hardhat run scripts/test-vesting-mechanics.ts --network amoy
```

### 3. `test-vesting-time-manipulation.ts` (ADVANCED)
**Purpose**: Time manipulation testing for development
**Use Case**: Development testing, time-based scenarios
**Features**:
- ⚠️ **WARNING**: Manipulates blockchain time
- ✅ Tests cliff period (0% vested)
- ✅ Tests linear vesting progression (25%, 50%, 75%, 100%)
- ✅ Verifies token locking/unlocking
- ✅ Resets time after testing

**Run Command**:
```bash
npx hardhat run scripts/test-vesting-time-manipulation.ts --network amoy
```

## 🚀 Quick Start

### Step 1: Safe Verification (Recommended)
```bash
cd contracts
npx hardhat run scripts/verify-vesting-mechanics.ts --network amoy
```

### Step 2: Deep Analysis
```bash
npx hardhat run scripts/test-vesting-mechanics.ts --network amoy
```

### Step 3: Time Manipulation Testing (Development Only)
```bash
npx hardhat run scripts/test-vesting-time-manipulation.ts --network amoy
```

## 📊 What Each Script Verifies

### Vesting Schedule Structure
- ✅ Start time validation
- ✅ End time validation
- ✅ 12-month cliff duration
- ✅ 24-month linear vesting duration
- ✅ Total 36-month duration
- ✅ Positive vesting amount

### Vesting Calculations
- ✅ 0% vested during cliff period
- ✅ Linear progression after cliff
- ✅ 25% vested at 18 months
- ✅ 50% vested at 24 months
- ✅ 75% vested at 30 months
- ✅ 100% vested at 36 months

### Smart Contract Enforcement
- ✅ Tokens locked during vesting
- ✅ Tokens unlocked after vesting
- ✅ Vesting schedule integrity
- ✅ Lock status accuracy

### Frontend Integration
- ✅ Vested amount display
- ✅ Locked amount display
- ✅ Percentage calculations
- ✅ Status indicators

## 🔍 Testing Scenarios

### Scenario 1: Cliff Period (Months 0-12)
- **Expected**: 0% tokens vested
- **Status**: All tokens locked
- **Frontend**: Shows "Cliff Period" status

### Scenario 2: Early Vesting (Months 13-24)
- **Expected**: 0-50% tokens vested
- **Status**: Partial tokens unlocked
- **Frontend**: Shows "Vesting Period" with progress

### Scenario 3: Mid Vesting (Months 25-36)
- **Expected**: 50-100% tokens vested
- **Status**: Most tokens unlocked
- **Frontend**: Shows "Vesting Period" with progress

### Scenario 4: Completed (Month 36+)
- **Expected**: 100% tokens vested
- **Status**: All tokens unlocked
- **Frontend**: Shows "Vesting Completed"

## ⚠️ Important Notes

### Time Manipulation Warnings
- **NEVER** run time manipulation scripts on mainnet
- **ONLY** use on testnets with no real value
- **ALWAYS** reset time after testing
- **VERIFY** current time before and after

### Network Requirements
- Scripts are configured for Polygon Amoy testnet
- Ensure you have testnet ETH for gas fees
- Verify contract addresses are correct
- Check network connectivity

### User Requirements
- Test user must have bonded USDC first
- User must have an active vesting schedule
- Sufficient testnet ETH for transactions

## 🐛 Troubleshooting

### Common Issues

#### No Vesting Schedule Found
```
❌ No vesting schedule found for test user
   User may not have bonded any USDC yet
```
**Solution**: User must bond USDC first to create vesting schedule

#### Contract Connection Errors
```
❌ Error getting current state: [Error details]
```
**Solution**: Check network connection and contract addresses

#### Time Manipulation Failures
```
❌ Error in time manipulation: [Error details]
```
**Solution**: Ensure you're on a testnet that supports time manipulation

### Debug Commands
```bash
# Check network status
npx hardhat console --network amoy

# Verify contract deployment
npx hardhat verify --network amoy [CONTRACT_ADDRESS]

# Check contract state
npx hardhat run scripts/verify-vesting-mechanics.ts --network amoy
```

## 📈 Monitoring & Maintenance

### Regular Checks
- Run safe verification weekly
- Monitor vesting progress monthly
- Verify frontend accuracy quarterly
- Test time scenarios before major updates

### Performance Metrics
- Vesting calculation accuracy
- Frontend display consistency
- Smart contract gas efficiency
- User experience quality

## 🎯 Success Criteria

### Vesting Mechanics ✅
- [ ] 12-month cliff enforced correctly
- [ ] 24-month linear vesting working
- [ ] Total 36-month duration accurate
- [ ] Token locking/unlocking functional

### Smart Contract ✅
- [ ] Vesting calculations accurate
- [ ] Lock status enforcement working
- [ ] Schedule integrity maintained
- [ ] Gas efficiency acceptable

### Frontend Integration ✅
- [ ] Vested amounts displayed correctly
- [ ] Progress indicators accurate
- [ ] Status messages clear
- [ ] Timeline visualization working

## 🚀 Deployment Readiness

When all tests pass:
1. ✅ Vesting mechanics verified
2. ✅ Smart contract tested
3. ✅ Frontend integration working
4. ✅ User experience validated
5. 🎯 **Ready for mainnet deployment**

## 📞 Support

For issues or questions:
1. Check this README first
2. Review script output for errors
3. Verify network and contract status
4. Consult development team

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Network**: Polygon Amoy Testnet
**Status**: Ready for Testing
