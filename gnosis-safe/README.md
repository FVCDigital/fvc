# Gnosis Safe Transaction Scripts

All owner-only operations on FVC contracts must be executed through the Gnosis Safe.

## Networks

| Network          | Safe Address |
|------------------|-------------|
| Ethereum Sepolia | 0xE20c89da2138951655DbbbE6E6db01fe561EBe82 |
| Base Sepolia     | 0x468D5B7fb6201f7cFbbA9A08B3bF49474145F61f |
| Ethereum Mainnet | TBD |

## How to use Transaction Builder

1. Go to https://app.safe.global/
2. Connect wallet and select your Safe
3. New transaction → Transaction Builder
4. For each transaction: paste To address, set Value to 0, paste ABI, fill params, Add transaction
5. Create Batch → Send Batch → Sign

## Files

| File | Purpose |
|------|---------|
| `ethereum-sepolia/01-set-vesting-threshold.txt`  | Set vestingThreshold on Sepolia Sale |
| `ethereum-sepolia/02-verify-state.ts`            | Read all on-chain state (run with ts-node) |
| `base-sepolia/01-initial-configuration.txt`      | Initial Sale + Staking setup on Base Sepolia |
| `base-sepolia/02-fund-staking-rewards.txt`       | Fund staking rewards on Base Sepolia |
| `ethereum-mainnet/01-deployment-sequence.txt`    | Full mainnet deployment checklist |
