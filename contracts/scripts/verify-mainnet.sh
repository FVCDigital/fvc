#!/bin/bash
# Verify all three mainnet contracts on Etherscan
# Run: bash scripts/verify-mainnet.sh

set -e

FVC="0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556"
SALE="0x0E99482aaA074C72756b78eDbdCA61E438729c54"
VESTING="0x24263Dce127Ad06cC272897629d6688Ec54df389"
DEPLOYER="0x020fd3bDCB2716B15c5ac0D2B242f26a5c54AcA6"
TREASURY="0xE20c89da2138951655DbbbE6E6db01fe561EBe82"
CHAINLINK="0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"
RATE=30000
CAP="100000000000000"   # parseUnits("100000000", 6)

echo "Verifying FVC..."
npx hardhat verify --network mainnet $FVC "$DEPLOYER"

echo "Verifying Vesting..."
npx hardhat verify --network mainnet $VESTING "$FVC"

echo "Verifying Sale..."
npx hardhat verify --network mainnet $SALE "$FVC" "$TREASURY" $RATE $CAP "$CHAINLINK"

echo "All verified."
