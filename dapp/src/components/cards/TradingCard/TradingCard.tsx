import React, { useState } from 'react';
import { theme } from '@/constants/theme';
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
import { useBondingFlow, useMockUSDCBalance } from '@/utils/handlers/bondingHandler';
import { useCurrentDiscount, useCurrentRound, MOCK_CONTRACTS } from '@/utils/contracts/bondingContract';
import { parseUnits, formatUnits } from 'viem';
import { 
  calculateFVCAmount, 
  getAssetDisplayName, 
  getActionButtonText, 
  shouldShowApproveButton,
  calculatePercentageAmount 
} from '@/utils';
import { Asset } from '@/types';

const ASSETS: Asset[] = [
  { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    address: MOCK_CONTRACTS.MOCK_USDC as `0x${string}`, 
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

const percentButtons = [0, 25, 50, 75, 100];

interface RoundConfig {
  roundId: bigint;
  initialDiscount: bigint;
  finalDiscount: bigint;
  epochCap: bigint;
  walletCap: bigint;
  vestingPeriod: bigint;
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
    step,
    errorMessage,
    handleApprove,
    handleBond: handleBondFlow,
    resetFlow,
    isApproving,
    isBonding,
    isApproved,
    isBonded,
  } = useBondingFlow(selectedAsset);

  // Contract data
  const { discount, isLoading: isLoadingDiscount } = useCurrentDiscount();
  const { currentRound, isLoading: isLoadingRound } = useCurrentRound();

  // Cast currentRound to proper type
  const round = currentRound as RoundConfig | undefined;

  // Balance - Use real balance for both ETH and USDC
  const ethBalance = useBalance({ 
    address: address as `0x${string}` | undefined,
    query: { enabled: !!address }
  });
  
  const usdcBalance = useBalance({ 
    address: address as `0x${string}` | undefined,
    token: MOCK_CONTRACTS.MOCK_USDC as `0x${string}`,
    query: { enabled: !!address }
  });
  
  const balance = selectedAsset.symbol === 'ETH' 
    ? ethBalance
    : usdcBalance;
  const isLoadingBalance = false;

  // KYC
  const { isVerified, triggerVerification, QrModal } = useKYC();
  const [showKycModal, setShowKycModal] = useState(false);

  // Calculate FVC output based on current discount
  const fvcAmount = calculateFVCAmount(bondAmount, discount as bigint | undefined);

  const handlePercent = (pct: number) => {
    if (!balance?.data) return;
    const value = calculatePercentageAmount(balance.data.formatted, pct, selectedAsset.decimals);
    setBondAmount(value);
  };

  const handleBond = async () => {
    if (!address) return;
    await handleBondFlow();
  };

  const handleApproveClick = async () => {
    if (!address) return;
    await handleApprove();
  };

  return (
    <div style={{
      background: theme.modalBackground,
      color: theme.primaryText,
      borderRadius: 16,
      padding: 28,
      fontWeight: 500,
      fontSize: 20,
      boxShadow: '0 4px 24px rgba(56,189,248,0.10)',
      margin: '16px auto',
      maxWidth: 420,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      border: `1px solid ${theme.modalButton}`,
      boxSizing: 'border-box',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Bonding</div>
      <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 16, textAlign: 'center' }}>
        Bond {getAssetDisplayName(selectedAsset)} for FVC tokens at a discount
      </div>
      
      <TabSwitcher tab={tab} setTab={setTab} />
      
      {tab === 'wallet' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 340 }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Wallet Payment</div>
          <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 16, textAlign: 'center' }}>
            Connect your wallet to bond {getAssetDisplayName(selectedAsset)} for FVC tokens
          </div>
          
          {/* Current Round Info */}
          {round && (
            <div style={{ 
              background: 'rgba(56,189,248,0.1)', 
              padding: '12px 16px', 
              borderRadius: 8, 
              marginBottom: 16,
              width: '100%',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 14, color: theme.secondaryText }}>
                Round {Number(round.roundId)} • {Number(round.initialDiscount)}% → {Number(round.finalDiscount)}% discount
              </div>
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
            <button
              onClick={handleApproveClick}
              disabled={isApproving || !address}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                background: isApproving ? theme.modalButton : theme.generalButton,
                color: theme.buttonText,
                fontSize: 18,
                fontWeight: 600,
                cursor: isApproving ? 'not-allowed' : 'pointer',
                marginTop: 16,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {isApproving ? 'Approving...' : 'Approve USDC'}
            </button>
          ) : (
            <button
              onClick={handleBond}
              disabled={isBonding || !address}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                background: isBonding ? theme.modalButton : theme.generalButton,
                color: theme.buttonText,
                fontSize: 18,
                fontWeight: 600,
                cursor: isBonding ? 'not-allowed' : 'pointer',
                marginTop: 16,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {getActionButtonText(selectedAsset, isBonding, isApproved, isApproving)}
            </button>
          )}

          {errorMessage && (
            <div style={{ 
              color: '#ef4444', 
              fontSize: 14, 
              marginTop: 8, 
              textAlign: 'center',
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.1)',
              borderRadius: 6
            }}>
              {errorMessage}
            </div>
          )}
        </div>
      )}
      
      {tab === 'card' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 340 }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Card Payment</div>
          <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 16, textAlign: 'center' }}>
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
                }}
              >
                Verify KYC
              </KYCButton>
              {showKycModal && <QrModal onClose={() => setShowKycModal(false)} />}
            </>
          ) : (
            <CardPaymentForm cardNumber={cardNumber} setCardNumber={setCardNumber} expiry={expiry} setExpiry={setExpiry} cvc={cvc} setCvc={setCvc} />
          )}
        </div>
      )}
    </div>
  );
};

export default TradingCard; 