/**
 * Batch Investor Vesting Deployment Script
 * 
 * Generates a Gnosis Safe batch transaction JSON file for deploying
 * vesting schedules to multiple investors at once.
 * 
 * Usage:
 *   1. Export investors JSON from admin panel: /admin/investors-export
 *   2. Save as investors-for-deployment.json
 *   3. Run: npx ts-node scripts/batch-investor-vesting.ts
 *   4. Upload generated JSON to Safe Transaction Builder
 *   5. Execute batch transaction via Gnosis Safe
 */

import * as fs from 'fs';
import { ethers } from 'ethers';

// Contract addresses - UPDATE FOR MAINNET
const SALE_CONTRACT_MAINNET = '0xdf95824ae269c62427a5925231b970aa43d709d1';
const SALE_CONTRACT_SEPOLIA = '0x60156C3290A98BD8025Bf17772dA0f338852b69E';

// Use mainnet by default
const CHAIN_ID = process.env.CHAIN_ID || '1';
const SALE_CONTRACT = CHAIN_ID === '1' ? SALE_CONTRACT_MAINNET : SALE_CONTRACT_SEPOLIA;

// Sale contract ABI (only mintOTC function needed)
const SALE_ABI = [
  'function mintOTC(address recipient, uint256 fvcAmount, uint256 cliff, uint256 duration) external'
];

interface InvestorData {
  wallet: string;
  fvc_amount: number;
  cliff_days: number;
  duration_days: number;
  user_name: string;
  user_email: string;
}

interface SafeTransaction {
  to: string;
  value: string;
  data: string;
  contractMethod?: {
    inputs: { name: string; type: string; internalType: string }[];
    name: string;
    payable: boolean;
  };
  contractInputsValues?: Record<string, string>;
}

interface SafeBatchFile {
  version: string;
  chainId: string;
  createdAt: number;
  meta: {
    name: string;
    description: string;
    txBuilderVersion: string;
  };
  transactions: SafeTransaction[];
}

function daysToSeconds(days: number): number {
  return days * 24 * 60 * 60;
}

function generateBatchTransaction(investors: InvestorData[]): SafeBatchFile {
  const saleInterface = new ethers.Interface(SALE_ABI);

  const transactions: SafeTransaction[] = investors.map((inv, index) => {
    const fvcAmountWei = ethers.parseUnits(inv.fvc_amount.toString(), 18);
    const cliffSeconds = daysToSeconds(inv.cliff_days);
    const durationSeconds = daysToSeconds(inv.duration_days);

    const data = saleInterface.encodeFunctionData('mintOTC', [
      inv.wallet,
      fvcAmountWei,
      cliffSeconds,
      durationSeconds
    ]);

    console.log(`[${index + 1}/${investors.length}] ${inv.user_name}`);
    console.log(`    Wallet: ${inv.wallet}`);
    console.log(`    FVC: ${inv.fvc_amount.toLocaleString()}`);
    console.log(`    Cliff: ${inv.cliff_days} days, Duration: ${inv.duration_days} days`);
    console.log('');

    return {
      to: SALE_CONTRACT,
      value: '0',
      data: data,
      contractMethod: {
        inputs: [
          { name: 'recipient', type: 'address', internalType: 'address' },
          { name: 'fvcAmount', type: 'uint256', internalType: 'uint256' },
          { name: 'cliff', type: 'uint256', internalType: 'uint256' },
          { name: 'duration', type: 'uint256', internalType: 'uint256' }
        ],
        name: 'mintOTC',
        payable: false
      },
      contractInputsValues: {
        recipient: inv.wallet,
        fvcAmount: fvcAmountWei.toString(),
        cliff: cliffSeconds.toString(),
        duration: durationSeconds.toString()
      }
    };
  });

  return {
    version: '1.0',
    chainId: CHAIN_ID,
    createdAt: Date.now(),
    meta: {
      name: 'Batch Investor Vesting Deployment',
      description: `Deploy vesting schedules for ${investors.length} investors`,
      txBuilderVersion: '1.16.3'
    },
    transactions
  };
}

function main() {
  console.log('='.repeat(60));
  console.log('BATCH INVESTOR VESTING DEPLOYMENT');
  console.log('='.repeat(60));
  console.log(`Chain ID: ${CHAIN_ID}`);
  console.log(`Sale Contract: ${SALE_CONTRACT}`);
  console.log('');

  // Read investors file
  const inputFile = process.argv[2] || 'investors-for-deployment.json';
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    console.error('');
    console.error('Usage:');
    console.error('  1. Export investors from admin panel: /admin/investors-export');
    console.error('  2. Save as investors-for-deployment.json');
    console.error('  3. Run: npx ts-node scripts/batch-investor-vesting.ts [input-file]');
    process.exit(1);
  }

  const investorsJson = fs.readFileSync(inputFile, 'utf-8');
  const investors: InvestorData[] = JSON.parse(investorsJson);

  if (investors.length === 0) {
    console.error('Error: No investors found in file');
    process.exit(1);
  }

  console.log(`Found ${investors.length} investors to deploy`);
  console.log('-'.repeat(60));
  console.log('');

  // Calculate totals
  const totalFVC = investors.reduce((sum, inv) => sum + inv.fvc_amount, 0);
  console.log(`Total FVC to vest: ${totalFVC.toLocaleString()}`);
  console.log('');

  // Generate batch transaction
  const batch = generateBatchTransaction(investors);

  // Write output file
  const outputFile = `safe-batch-vesting-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(batch, null, 2));

  console.log('-'.repeat(60));
  console.log(`Generated: ${outputFile}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Go to https://app.safe.global');
  console.log('  2. Select your Safe wallet');
  console.log('  3. Click "New Transaction" > "Transaction Builder"');
  console.log(`  4. Upload ${outputFile}`);
  console.log('  5. Review and execute the batch transaction');
  console.log('');
  console.log('='.repeat(60));
}

main();
