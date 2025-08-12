#!/bin/bash

echo "🧹 CLEANING UP EXCESSIVE SCRIPT FILES"
echo "======================================"

# Create backup
echo "📦 Creating backup..."
cp -r contracts/scripts contracts/scripts_backup_$(date +%Y%m%d_%H%M%S)

# Keep essential scripts, remove bloat
echo "🗑️  Removing excessive debugging scripts..."

# Remove problematic debugging scripts
rm -f contracts/scripts/debugging/debug-*.js
rm -f contracts/scripts/debugging/debug-*.ts
rm -f contracts/scripts/debugging/simple-check.js
rm -f contracts/scripts/debugging/test-*.js
rm -f contracts/scripts/debugging/test-*.ts

# Remove excessive unlock scripts (keep only emergency-unlock.ts)
rm -f contracts/scripts/utilities/force-unlock-*.ts
rm -f contracts/scripts/utilities/immediate-unlock.ts
rm -f contracts/scripts/utilities/final-unlock-attempt.ts
rm -f contracts/scripts/utilities/unlock-*.ts
rm -f contracts/scripts/utilities/direct-unlock.ts

# Remove redundant fix scripts
rm -f contracts/scripts/utilities/fix-*.ts
rm -f contracts/scripts/testing/fix-*.js
rm -f contracts/scripts/testing/debug-*.js

# Remove redundant testing scripts (keep test-round-transition.ts)
rm -f contracts/scripts/testing/test-bonding*.js
rm -f contracts/scripts/testing/test-fvc*.js
rm -f contracts/scripts/testing/test-minimal*.ts
rm -f contracts/scripts/testing/simple-test.ts
rm -f contracts/scripts/testing/investigate-*.js
rm -f contracts/scripts/testing/verify-*.js
rm -f contracts/scripts/testing/reset-*.js
rm -f contracts/scripts/testing/set-*.js

# Remove redundant deployment scripts
rm -f contracts/scripts/deployment/deploy-simple-*.js
rm -f contracts/scripts/deployment/deploy-updated-*.js
rm -f contracts/scripts/deployment/deploy-updated-*.ts

echo "✅ Cleanup complete!"
echo ""
echo "📊 Files remaining:"
find contracts/scripts -name "*.js" -o -name "*.ts" | wc -l
echo ""
echo "📋 Essential scripts kept:"
echo "- deployment/deploy-bonding.ts"
echo "- deployment/deploy-fvc.ts" 
echo "- verification/execute-bonding-test.ts"
echo "- utilities/emergency-unlock.ts"
echo "- testing/test-round-transition.ts"
echo "- production-validation.ts"
echo ""
echo "🔍 Run production validation:"
echo "npx hardhat run scripts/production-validation.ts --network amoy"
