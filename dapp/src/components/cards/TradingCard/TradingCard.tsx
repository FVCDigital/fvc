import React, { useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import TabSwitcher from './TabSwitcher';
import AssetSelector from './AssetSelector';
import BondingProgressBar from './BondingProgressBar';
import AmountInput from './AmountInput';
import FVCOutput from './FVCOutput';
import CardPaymentForm from './CardPaymentForm';
import BondingTerms from './BondingTerms';
import useKYC from '@/utils/hooks/useKYC';
import KYCButton from '@/components/cards/KYCButton';
import { useBondingFlow, useBondingContractBalance } from '@/utils/handlers/bondingHandler';
import { useCurrentDiscount, useCurrentRound, useCurrentPrice, useCurrentPrices, useEthUsdPrice, CONTRACTS } from '@/utils/contracts/bondingContract';
import { formatUnits } from 'viem';
import { 
  calculateFVCAmount, 
  calculateFVCAmountFromUSDC,
  calculateFVCAmountFromETH,
  getAssetDisplayName, 
  getActionButtonText, 
  shouldShowApproveButton,
  calculatePercentageAmount 
} from '@/utils';
import { Asset } from '@/types';
import BondingStats from './BondingStats';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ASSETS: Asset[] = [
  { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    address: ('USDC' in CONTRACTS ? CONTRACTS.USDC : CONTRACTS.MOCK_USDC) as `0x${string}`, 
    decimals: 6,
    logo: '/assets/usdc-logo.png',
    color: '#2775CA'
  },
  { 
    symbol: 'ETH', 
    name: 'Ethereum', 
    address: '0x0000000000000000000000000000000000000000', 
    decimals: 18,
    logo: '/assets/eth-logo.png',
    color: '#627EEA'
  },
];

interface RoundConfig {
  roundId: bigint;
  initialDiscount: bigint;
  finalDiscount: bigint;
  epochCap: bigint;
  walletCap: bigint;
  vestingPeriod: bigint;
  fvcAllocated: bigint;
  fvcSold: bigint;
  isActive: boolean;
  totalBonded: bigint;
}

const TradingCard: React.FC<{ mode?: 'crypto' }> = ({ mode }) => {
  const [tab, setTab] = useState<'wallet' | 'card'>('wallet');
  const { address } = useAccount();
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  
  // Bonding flow
  const {
    bondAmount,
    setBondAmount,
    errorMessage,
    handleApprove,
    handleBond: handleBondFlow,
    isApproving,
    isBonding,
    isApproved,
  } = useBondingFlow(selectedAsset);

  // Contract data
  const { discount } = useCurrentDiscount();
  const { currentRound } = useCurrentRound();
  const { bondingContractBalance, isLoading: isLoadingBalance } = useBondingContractBalance();
  const { price: currentPrice } = useCurrentPrice();
  const { prices: currentPrices, isLoading: isLoadingPrices } = useCurrentPrices();
  const { ethUsdPrice } = useEthUsdPrice();

  // Handle the new contract structure - currentRound is now an array
  const round = currentRound && Array.isArray(currentRound) ? {
    roundId: currentRound[0],
    initialDiscount: currentRound[1],
    finalDiscount: currentRound[2],
    epochCap: currentRound[3],
    walletCap: currentRound[4],
    vestingPeriod: currentRound[5],
    fvcAllocated: currentRound[6],
    fvcSold: currentRound[7],
    isActive: currentRound[8],
    totalBonded: currentRound[9]
  } as RoundConfig : undefined;

  // Balance - Use real balance for both ETH and USDC
  const ethBalance = useBalance({ 
    address: address as `0x${string}` | undefined,
    query: { enabled: !!address }
  });
  
  const usdcBalance = useBalance({ 
    address: address as `0x${string}` | undefined,
    token: ('USDC' in CONTRACTS ? CONTRACTS.USDC : CONTRACTS.MOCK_USDC) as `0x${string}`,
    query: { enabled: !!address }
  });
  
  const balance = selectedAsset.symbol === 'ETH' 
    ? ethBalance
    : usdcBalance;

  // KYC
  const { isVerified, triggerVerification, QrModal } = useKYC();
  const [showKycModal, setShowKycModal] = useState(false);

  // Calculate FVC output based on current price
  const fvcAmount = selectedAsset.symbol === 'USDC' 
    ? calculateFVCAmountFromUSDC(bondAmount, currentPrice)
    : selectedAsset.symbol === 'ETH' && ethUsdPrice && currentPrice
      ? calculateFVCAmountFromETH(bondAmount, ethUsdPrice, currentPrice)
      : calculateFVCAmount(bondAmount, discount as bigint | undefined, selectedAsset);
  
  const handlePercent = (pct: number) => {
    if (!balance?.data) return;
    const value = calculatePercentageAmount(balance.data.formatted, pct, selectedAsset.decimals);
    setBondAmount(value);
  };

  const handleBond = async () => {
    if (!address) return;
    if (selectedAsset.symbol === 'ETH') {
      await handleBondFlow(fvcAmount);
    } else {
      await handleBondFlow();
    }
  };

  const handleApproveClick = async () => {
    if (!address) return;
    await handleApprove();
  };

  return (
    <Card className="max-w-[600px] w-full mx-auto my-4 shadow-xl border-border bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">Bonding</CardTitle>
        <CardDescription>
          Bond {getAssetDisplayName(selectedAsset)} for FVC tokens at a discount
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center">
        <TabSwitcher tab={tab} setTab={setTab} />
        
        {tab === 'wallet' && (
          <div className="w-full flex flex-col items-center">
            
            {/* Current Round Info */}
            {round && (
              <div className="bg-sky-500/10 text-sky-600 dark:text-sky-400 px-4 py-3 rounded-xl mb-4 text-sm font-medium w-full text-center border border-sky-500/20">
                Round {Number(round.roundId)} • {Number(round.initialDiscount)}% → {Number(round.finalDiscount)}% discount
              </div>
            )}

            {/* Asset Selector */}
            <AssetSelector assets={ASSETS} selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} />
            
            {/* Bonding Progress */}
            {round && (
              <BondingProgressBar 
                progress={Number(round.totalBonded) / Number(round.epochCap) * 100} 
              />
            )}

            {/* Bonding Stats */}
            <BondingStats
              totalBonded={round?.totalBonded || 0n}
              epochCap={round?.epochCap || 0n}
              currentDiscount={discount ? Number(discount) : 0}
              initialDiscount={round?.initialDiscount ? Number(round.initialDiscount) : 20}
              fvcAllocated={round?.fvcAllocated || 0n}
              fvcSold={round?.fvcSold || 0n}
              bondingContractBalance={bondingContractBalance}
            />

            {/* Price Display */}
            {currentPrices && !isLoadingPrices && (
              <div className="bg-sky-500/10 rounded-xl p-3 mb-4 w-full text-center border border-sky-500/20">
                <div className="text-xs text-muted-foreground mb-1 font-medium">
                  Current FVC Price
                </div>
                <div className="text-base font-bold text-foreground">
                  ${(Number(currentPrices[0]) / 1000).toFixed(3)} USDC
                </div>
                {currentPrices[1] > 0n && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatUnits(currentPrices[1], 18)} ETH
                  </div>
                )}
              </div>
            )}

            {/* Amount Input */}
            <AmountInput 
              input={bondAmount}
              setInput={setBondAmount}
              balance={balance}
              isLoading={isLoadingBalance}
              selectedAsset={selectedAsset}
              handlePercent={handlePercent}
            />

            {/* FVC Output */}
            <FVCOutput fvcAmount={fvcAmount} currentDiscount={discount ? Number(discount) : 0} />

            {/* Bonding Terms */}
            <BondingTerms />

            {/* Action Buttons */}
            {shouldShowApproveButton(selectedAsset, isApproved) ? (
              <Button
                onClick={handleApproveClick}
                disabled={isApproving || !address}
                className="w-full mt-6 h-12 text-lg font-bold"
                size="lg"
                variant={isApproving ? "secondary" : "default"}
              >
                {isApproving ? 'Approving USDC...' : 'Approve USDC'}
              </Button>
            ) : (
              <Button
                onClick={handleBond}
                disabled={isBonding || !address}
                className="w-full mt-6 h-12 text-lg font-bold"
                size="lg"
                variant={isBonding ? "secondary" : "default"}
              >
                {getActionButtonText(selectedAsset, isBonding, isApproved, isApproving)}
              </Button>
            )}

            {errorMessage && (
              <div className="text-destructive text-sm mt-3 text-center bg-destructive/10 p-2 rounded-md w-full border border-destructive/20">
                {errorMessage}
              </div>
            )}
          </div>
        )}
        
        {tab === 'card' && (
          <div className="w-full max-w-[340px] flex flex-col items-center">
            <div className="text-2xl font-bold mb-2">Card Payment</div>
            <div className="text-base text-muted-foreground mb-4 text-center">
              Enter your card details to purchase FVC
            </div>
            
            {!isVerified ? (
              <>
                <KYCButton
                  onClick={() => {
                    setShowKycModal(true);
                    setTimeout(() => { triggerVerification(); }, 0);
                  }}
                  style={{
                    fontWeight: 600,
                    fontSize: 18,
                    padding: '12px 24px',
                    margin: '24px 0',
                    width: '100%',
                    borderRadius: '10px',
                  }}
                >
                  Verify KYC
                </KYCButton>
                {showKycModal && <QrModal onClose={() => setShowKycModal(false)} />}
              </>
            ) : (
              <CardPaymentForm cardNumber={cardNumber} setCardNumber={setCardNumber} expiry={expiry} setExpiry={setExpiry} cvc={cvc} setCvc={setCvc} />
            )}

            {/* Bonding Terms for Card Tab */}
            <BondingTerms />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradingCard;
