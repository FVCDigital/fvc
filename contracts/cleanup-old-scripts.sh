#!/bin/bash

# FVC Protocol - Cleanup Old Scripts
# This script removes old testing/debugging scripts that should be in the test directory

echo "🧹 FVC Protocol - Cleaning Up Old Scripts"
echo "============================================================"

echo "This script will remove old testing/debugging scripts from the scripts/ directory"
echo "These should be replaced with proper test files in the test/ directory"
echo ""

# List of files to remove (testing/debugging scripts)
FILES_TO_REMOVE=(
    "test-vesting-mechanics.ts"
    "test-vesting-time-manipulation.ts"
    "verify-vesting-mechanics.ts"
    "check-usdc-flow.ts"
    "check-vesting-status.ts"
    "test-bonding-transaction.ts"
    "test-working-bonding.ts"
    "check-wallet-balances.ts"
    "find-actual-bonding-contract.ts"
    "check-user-bonding.ts"
    "check-new-bonding-state.ts"
    "test-frontend-contract-reading.ts"
    "test-bonding-end-to-end.ts"
    "test-final-correct-bonding.ts"
    "test-final-bonding.ts"
    "test-fixed-bonding.ts"
    "test-new-bonding-math.ts"
    "verify-bonding-success.ts"
    "test-small-bonding.ts"
    "debug-bonding-issue.ts"
    "setup-usdc-testing.ts"
    "test-enhanced-bonding.ts"
    "test-bonding-real.ts"
    "test-bonding-amoy.ts"
    "debug-vesting-mismatch.ts"
    "debug-vesting-issue.ts"
    "test-dashboard-hook.ts"
    "check-user-vesting.ts"
    "check-deployed-addresses.ts"
    "test-vesting-amoy.ts"
    "test-release.ts"
    "test-private-investor.ts"
    "test-vesting-release.ts"
    "test-workflow.ts"
    "check-fvc-balance.ts"
    "check-vesting-state.ts"
)

echo "📋 Files to be removed:"
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "scripts/$file" ]; then
        echo "  ❌ $file"
    else
        echo "  ✅ $file (already removed)"
    fi
done

echo ""
echo "⚠️  WARNING: This will permanently delete these files!"
echo "Make sure you have backed up any important information."
echo ""

read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing old testing scripts..."
    
    for file in "${FILES_TO_REMOVE[@]}"; do
        if [ -f "scripts/$file" ]; then
            rm "scripts/$file"
            echo "  ✅ Removed: $file"
        fi
    done
    
    echo ""
    echo "🧹 Cleanup complete!"
    echo ""
    echo "📁 New structure:"
    echo "  contracts/"
    echo "  ├── test/                    # All testing logic"
    echo "  │   ├── bonding.test.ts     # Bonding tests"
    echo "  │   ├── vesting.test.ts     # Vesting tests"
    echo "  │   ├── fvc.test.ts         # FVC tests"
    echo "  │   ├── vesting-mechanics.test.ts  # Comprehensive vesting tests"
    echo "  │   └── utils/              # Test utilities"
    echo "  └── scripts/                 # Deployment only"
    echo "      └── hardhat/            # Hardhat deployment"
    echo "          └── DeployBonding.ts"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Run tests: npx hardhat test"
    echo "2. Deploy: npx hardhat run scripts/hardhat/DeployBonding.ts"
    echo "3. Verify vesting mechanics work correctly"
    
else
    echo "❌ Cleanup cancelled"
    echo ""
    echo "You can manually remove files or run this script again later"
fi

echo ""
echo "📚 For more information, see:"
echo "  - contracts/README.md"
echo "  - contracts/test/README-vesting-testing.md"
