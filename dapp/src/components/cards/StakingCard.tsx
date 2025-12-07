import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import {
  STAKING_ADDRESS,
  FVC_ADDRESS,
  stakingRewardsABI,
  fvcABI,
} from '@/contracts/staking';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const StakingCard: React.FC = () => {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [isStakeMode, setIsStakeMode] = useState(true);

  const { data: fvcBalance } = useReadContract({
    address: FVC_ADDRESS,
    abi: fvcABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: stakedBalance } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingRewardsABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: earnedRewards } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingRewardsABI,
    functionName: 'earned',
    args: address ? [address] : undefined,
  });

  const { data: approveHash, writeContract: approve } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: stakeHash, writeContract: stake } = useWriteContract();
  const { isLoading: isStaking } = useWaitForTransactionReceipt({ hash: stakeHash });

  const { data: withdrawHash, writeContract: withdraw } = useWriteContract();
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawHash });

  const { data: claimHash, writeContract: claim } = useWriteContract();
  const { isLoading: isClaiming } = useWaitForTransactionReceipt({ hash: claimHash });

  const handleApprove = () => {
    if (!amount || !address) return;
    approve({
      address: FVC_ADDRESS,
      abi: fvcABI,
      functionName: 'approve',
      args: [STAKING_ADDRESS, parseUnits(amount, 18)],
    });
  };

  const handleStake = () => {
    if (!amount || !address) return;
    stake({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'stake',
      args: [parseUnits(amount, 18)],
    });
  };

  const handleWithdraw = () => {
    if (!amount || !address) return;
    withdraw({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'withdraw',
      args: [parseUnits(amount, 18)],
    });
  };

  const handleClaim = () => {
    if (!address) return;
    claim({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'getReward',
    });
  };

  const setMax = () => {
    const balance = isStakeMode ? fvcBalance : stakedBalance;
    if (balance) {
      setAmount(formatUnits(balance, 18));
    }
  };

  if (!address) {
    return (
      <Card className="max-w-[480px] w-full mx-auto my-4 shadow-xl border-border bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="mb-2">Staking</CardTitle>
          <CardDescription>Connect wallet to stake</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rewardsValue = earnedRewards ? Number(formatUnits(earnedRewards, 6)) : 0;
  const hasRewards = rewardsValue > 0;

  return (
    <Card className="max-w-[480px] w-full mx-auto my-4 shadow-xl border-border bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Staking</CardTitle>
        <CardDescription>Stake FVC to earn USDC rewards</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">
              Staked
            </div>
            <div className="text-lg font-bold text-foreground">
              {stakedBalance ? Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">FVC</div>
          </div>

          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
            <div className="text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">
              Rewards
            </div>
            <div className="text-lg font-bold text-green-500">
              {rewardsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">USDC</div>
          </div>
        </div>

        {/* Claim Button */}
        {hasRewards && (
          <Button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
            size="lg"
          >
            {isClaiming ? 'Claiming...' : `Claim ${rewardsValue.toFixed(2)} USDC`}
          </Button>
        )}

        {/* Mode Toggle */}
        <div className="flex bg-muted/40 p-1 rounded-xl">
          <button
            onClick={() => setIsStakeMode(true)}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all",
              isStakeMode 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Stake
          </button>
          <button
            onClick={() => setIsStakeMode(false)}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all",
              !isStakeMode 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Unstake
          </button>
        </div>

        {/* Input */}
        <div className="bg-muted/30 rounded-xl p-4 border border-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">
              {isStakeMode ? 'Amount to stake' : 'Amount to unstake'}
            </span>
            <span className="text-xs text-muted-foreground">
              Balance: {isStakeMode 
                ? (fvcBalance ? Number(formatUnits(fvcBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0')
                : (stakedBalance ? Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0')
              } FVC
            </span>
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pr-16 h-12 text-lg font-semibold bg-background"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={setMax}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-[10px] font-bold text-primary hover:text-primary hover:bg-primary/10"
            >
              MAX
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        {isStakeMode ? (
          <div className="flex gap-3">
            <Button
              onClick={handleApprove}
              disabled={isApproving || !amount}
              variant="secondary"
              className="flex-1 font-semibold"
              size="lg"
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              onClick={handleStake}
              disabled={isStaking || !amount}
              className="flex-1 font-semibold"
              size="lg"
            >
              {isStaking ? 'Staking...' : 'Stake'}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleWithdraw}
            disabled={isWithdrawing || !amount}
            className="w-full font-semibold"
            size="lg"
          >
            {isWithdrawing ? 'Unstaking...' : 'Unstake'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default StakingCard;
