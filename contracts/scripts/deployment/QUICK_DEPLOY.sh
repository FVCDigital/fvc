#!/bin/bash

# FVC Protocol Quick Deployment Script
# This script runs all deployment steps in the correct order

echo "🚀 Starting FVC Protocol deployment..."

# Step 1: Deploy contracts
echo "📦 Step 1: Deploying contracts..."
npx hardhat run scripts/deployment/deploy-bonding.js --network amoy

# Step 2: Update addresses in scripts (manual step)
echo ""
echo "📝 Step 2: Update contract addresses in scripts"
echo "Please update the following files with your new contract addresses:"
echo "- contracts/scripts/debugging/set-fvc-bonding-contract.js"
echo "- contracts/scripts/debugging/allocate-fvc.js"
echo "- contracts/scripts/debugging/start-new-round.js"
echo "- contracts/scripts/debugging/mint-fvc-to-admin.js"
echo "- contracts/scripts/debugging/setup-new-deployment.js"
echo "- contracts/scripts/debugging/check-deployment-status.js"
echo ""
read -p "Press Enter after updating addresses..."

# Step 3: Run complete setup
echo "⚙️  Step 3: Running complete setup..."
npx hardhat run scripts/debugging/setup-new-deployment.js --network amoy

# Step 4: Verify deployment
echo "🔍 Step 4: Verifying deployment..."
npx hardhat run scripts/debugging/check-deployment-status.js --network amoy

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test the dApp UI"
echo "2. Run bonding transactions"
echo "3. Verify all functionality works"
echo ""
echo "To start the dApp:"
echo "cd ../dapp && npm run dev"
