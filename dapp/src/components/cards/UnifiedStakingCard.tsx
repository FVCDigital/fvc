import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import {
  STAKING_ADDRESS,
  FVC_ADDRESS,
  USDC_ADDRESS,
  FAUCET_ADDRESS,
  stakingRewardsABI,
  fvcABI,
  faucetABI,
} from '@/contracts/staking';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  if (seconds === 0) return 'Now';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

const UnifiedStakingCard: React.FC = () => {
  const { address } = useAccount();
  const faucetConfigured = /^0x[a-fA-F0-9]{40}$/.test(String(FAUCET_ADDRESS || ''));
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [apy, setApy] = useState(8.5);

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

  const { data: totalStaked } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingRewardsABI,
    functionName: 'totalSupply',
  });

  const { data: claimStatus } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: faucetABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
    query: { enabled: !!address && faucetConfigured },
  });

  const { data: userInfo } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: faucetABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
    query: { enabled: !!address && faucetConfigured },
  });

  const { data: approveHash, writeContract: approve } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: stakeHash, writeContract: stake } = useWriteContract();
  const { isLoading: isStaking } = useWaitForTransactionReceipt({ hash: stakeHash });

  const { data: withdrawHash, writeContract: withdraw } = useWriteContract();
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawHash });

  const { data: claimHash, writeContract: claim } = useWriteContract();
  const { isLoading: isClaiming } = useWaitForTransactionReceipt({ hash: claimHash });

  const { data: faucetHash, writeContract: faucetClaim } = useWriteContract();
  const { isLoading: isFaucetClaiming } = useWaitForTransactionReceipt({ hash: faucetHash });

  useEffect(() => {
    const interval = setInterval(() => {
      const baseApy = 8.5;
      const variation = (Math.random() - 0.5) * 2;
      setApy(Number((baseApy + variation).toFixed(2)));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleApprove = () => {
    if (!stakeAmount || !address) return;
    approve({
      address: FVC_ADDRESS,
      abi: fvcABI,
      functionName: 'approve',
      args: [STAKING_ADDRESS, parseUnits(stakeAmount, 18)],
    });
  };

  const handleStake = () => {
    if (!stakeAmount || !address) return;
    stake({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'stake',
      args: [parseUnits(stakeAmount, 18)],
    });
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || !address) return;
    withdraw({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'withdraw',
      args: [parseUnits(withdrawAmount, 18)],
    });
  };

  const handleClaimRewards = () => {
    if (!address) return;
    claim({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'getReward',
    });
  };

  const handleFaucetClaim = () => {
    if (!address || !faucetConfigured) return;
    faucetClaim({
      address: FAUCET_ADDRESS,
      abi: faucetABI,
      functionName: 'claim',
    });
  };

  const setMaxStake = () => {
    if (fvcBalance) {
      setStakeAmount(formatUnits(fvcBalance, 18));
    }
  };

  const setMaxWithdraw = () => {
    if (stakedBalance) {
      setWithdrawAmount(formatUnits(stakedBalance, 18));
    }
  };

  const canClaim = faucetConfigured ? (claimStatus?.[0] ?? false) : false;
  const remainingCooldown = faucetConfigured ? Number(claimStatus?.[1] ?? 0) : 0;
  const remainingClaims = faucetConfigured ? Number(claimStatus?.[2] ?? 0) : 0;
  const hasLowBalance = fvcBalance ? Number(formatUnits(fvcBalance, 18)) < 1000 : true;

  if (!address) {
    return (
      <Card className="max-w-[800px] w-full mx-auto border-border bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="mb-2">Stake FVC & Earn Rewards</CardTitle>
          <CardDescription>Connect your wallet to start staking</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-[800px] w-full mx-auto border-border bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>Stake FVC & Earn Rewards</CardTitle>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-3 py-1.5 rounded-lg text-sm font-bold text-white shadow-lg shadow-green-900/20">
            {apy}% APY
          </div>
        </div>
        <CardDescription>
          Stake FVC tokens to earn proportional USDC rewards from treasury yields
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="text-[11px] text-muted-foreground mb-1">Your Balance</div>
            <div className="text-lg font-bold">
              {fvcBalance ? Number(formatUnits(fvcBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} FVC
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="text-[11px] text-muted-foreground mb-1">Staked</div>
            <div className="text-lg font-bold text-primary">
              {stakedBalance ? Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} FVC
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="text-[11px] text-muted-foreground mb-1">Rewards</div>
            <div className="text-lg font-bold text-green-500">
              {earnedRewards ? Number(formatUnits(earnedRewards, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} USDC
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <div className="text-[11px] text-muted-foreground mb-1">Total Staked</div>
            <div className="text-lg font-bold">
              {totalStaked ? Number(formatUnits(totalStaked, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'} FVC
            </div>
          </div>
        </div>

        {/* Faucet Section (if low balance) */}
        {faucetConfigured && hasLowBalance && remainingClaims > 0 && (
          <div className="bg-gradient-to-br from-primary/10 to-green-500/10 rounded-xl p-5 border border-primary/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="font-semibold mb-1">Get FVC</div>
                <div className="text-xs text-muted-foreground">
                  {remainingClaims} claims remaining • {canClaim ? 'Ready now' : `Next claim in ${formatTime(remainingCooldown)}`}
                </div>
              </div>
              <Button
                onClick={handleFaucetClaim}
                disabled={!faucetConfigured || !canClaim || isFaucetClaiming || remainingClaims === 0}
                className="w-full sm:w-auto font-bold"
                size="sm"
              >
                {isFaucetClaiming ? 'Claiming...' : 'Claim 10 FVC'}
              </Button>
            </div>
          </div>
        )}

        {/* Stake Section */}
        <div className="bg-muted/20 rounded-xl p-5 border border-border">
          <div className="text-sm font-semibold mb-3">Stake FVC</div>
          
          <div className="relative mb-3">
            <Input
              type="number"
              placeholder="0.0"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="pr-16 h-12 text-lg font-semibold bg-background"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={setMaxStake}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-[10px] font-bold text-primary hover:text-primary hover:bg-primary/10"
            >
              MAX
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleApprove}
              disabled={isApproving || !stakeAmount}
              variant="secondary"
              className="flex-1 font-semibold bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 hover:text-violet-400 border-violet-500/20"
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              onClick={handleStake}
              disabled={isStaking || !stakeAmount}
              className="flex-1 font-semibold"
            >
              {isStaking ? 'Staking...' : 'Stake'}
            </Button>
          </div>
        </div>

        {/* Withdraw Section */}
        <div className="bg-muted/20 rounded-xl p-5 border border-border">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-semibold">Withdraw FVC</div>
            <div className="text-xs text-muted-foreground">
              Staked: {stakedBalance ? Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} FVC
            </div>
          </div>
          
          <div className="relative mb-3">
            <Input
              type="number"
              placeholder="0.0"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="pr-16 h-12 text-lg font-semibold bg-background"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={setMaxWithdraw}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-[10px] font-bold text-primary hover:text-primary hover:bg-primary/10"
            >
              MAX
            </Button>
          </div>

          <Button
            onClick={handleWithdraw}
            disabled={isWithdrawing || !withdrawAmount}
            variant="secondary"
            className="w-full font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 border-amber-500/20"
          >
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </div>

        {/* Claim Rewards */}
        <Button
          onClick={handleClaimRewards}
          disabled={isClaiming || !earnedRewards || earnedRewards === 0n}
          className="w-full font-bold bg-green-600 hover:bg-green-700 text-white h-12"
        >
          {isClaiming ? 'Claiming...' : 'Claim USDC Rewards'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default UnifiedStakingCard;
