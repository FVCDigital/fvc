import React from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FAUCET_ADDRESS, faucetABI } from '@/contracts/staking';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  if (seconds === 0) return 'Now';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

const FaucetCard: React.FC = () => {
  const { address } = useAccount();
  const faucetConfigured = /^0x[a-fA-F0-9]{40}$/.test(String(FAUCET_ADDRESS || ''));

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

  const { data: claimHash, writeContract: claim } = useWriteContract();
  const { isLoading: isClaiming } = useWaitForTransactionReceipt({ hash: claimHash });

  const handleClaim = () => {
    if (!address || !faucetConfigured) return;
    claim({
      address: FAUCET_ADDRESS,
      abi: faucetABI,
      functionName: 'claim',
    });
  };

  if (!address) {
    return (
      <Card className="w-full max-w-[800px] mx-auto bg-card/80 backdrop-blur-sm border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold mb-2">Get Testnet FVC</CardTitle>
          <CardDescription>
            Connect your wallet to claim free testnet FVC tokens
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canClaim = faucetConfigured ? (claimStatus?.[0] ?? false) : false;
  const remainingCooldown = faucetConfigured ? Number(claimStatus?.[1] ?? 0) : 0;
  const remainingClaims = faucetConfigured ? Number(claimStatus?.[2] ?? 0) : 0;
  const totalClaims = faucetConfigured ? Number(userInfo?.[0] ?? 0) : 0;
  const isMaxClaimsReached = remainingClaims === 0;

  return (
    <Card className="w-full max-w-[500px] mx-auto bg-card/80 backdrop-blur-sm border-border shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Get Testnet FVC</CardTitle>
        <CardDescription>
          Claim free testnet tokens to try staking. Each claim gives you 10 FVC.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!faucetConfigured && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground text-center">
            Faucet unavailable: not configured.
          </div>
        )}

        {faucetConfigured && (
          <div className="bg-muted/30 rounded-xl p-5 border border-border">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Claims Used</div>
                <div className="text-xl font-bold">{totalClaims} / 5</div>
              </div>

              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Remaining</div>
                <div className="text-xl font-bold text-primary">{remainingClaims}</div>
              </div>

              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Next Claim</div>
                <div className={cn(
                  "text-xl font-bold",
                  canClaim ? "text-green-500" : "text-muted-foreground"
                )}>
                  {canClaim ? 'Now' : formatTime(remainingCooldown)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <Button
          onClick={handleClaim}
          disabled={!faucetConfigured || !canClaim || isClaiming || isMaxClaimsReached}
          className={cn(
            "w-full font-bold text-base h-12 shadow-lg transition-all",
            !faucetConfigured || !canClaim || isClaiming || isMaxClaimsReached
              ? "opacity-50 cursor-not-allowed" 
              : "hover:-translate-y-0.5"
          )}
          variant={(!faucetConfigured || !canClaim || isClaiming || isMaxClaimsReached) ? "secondary" : "default"}
        >
          {isClaiming
            ? 'Claiming...'
            : !faucetConfigured
            ? 'Faucet Unavailable'
            : isMaxClaimsReached
            ? 'Max Claims Reached'
            : !canClaim
            ? `Cooldown Active (${formatTime(remainingCooldown)})`
            : 'Claim 10 FVC'}
        </Button>

        {faucetConfigured && isMaxClaimsReached && (
          <div className="w-full p-3 bg-muted/30 rounded-lg border border-border text-sm text-muted-foreground text-center">
            You've reached the maximum claims. Use your FVC to test staking!
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default FaucetCard;
