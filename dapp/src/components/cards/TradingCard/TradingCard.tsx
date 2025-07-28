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
import usePolygonId from '@/utils/hooks/useKYC';
import KYCButton from '@/components/cards/KYCButton';
import { useBondingFlow, useMockUSDCBalance } from '@/utils/handlers/bondingHandler';
import { useCurrentDiscount, useCurrentRound, MOCK_CONTRACTS } from '@/utils/contracts/bondingContract';
import { parseUnits, formatUnits } from 'viem';

const ASSETS = [
  { symbol: 'USDC', name: 'USD Coin', address: MOCK_CONTRACTS.MOCK_USDC },
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
  } = useBondingFlow();

  // Contract data
  const { discount, isLoading: isLoadingDiscount } = useCurrentDiscount();
  const { currentRound, isLoading: isLoadingRound } = useCurrentRound();

  // Cast currentRound to proper type
  const round = currentRound as RoundConfig | undefined;

  // Balance - Use mock balance for testing
  const balance = useMockUSDCBalance();
  const isLoadingBalance = false;

  // KYC
  const { isVerified, triggerVerification, QrModal } = usePolygonId();
  const [showKycModal, setShowKycModal] = useState(false);

  // Calculate FVC output based on current discount
  const calculateFVCAmount = (usdcAmount: string) => {
    if (!usdcAmount || !discount) return '';
    const amount = parseFloat(usdcAmount);
    const discountPercent = Number(discount) / 100;
    const fvcAmount = amount / (1 - discountPercent);
    return fvcAmount.toFixed(4);
  };

  const fvcAmount = calculateFVCAmount(bondAmount);

  const handlePercent = (pct: number) => {
    if (!balance?.data) return;
    const value = (Number(balance.data.formatted) * pct / 100).toFixed(6);
    setBondAmount(value);
  };

  const handleBond = async () => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }
    
    if (!bondAmount || parseFloat(bondAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(bondAmount) > Number(balance?.data?.formatted || 0)) {
      alert('Insufficient balance');
      return;
    }

    // Start bonding flow
    handleApprove();
  };

  const getStepMessage = () => {
    switch (step) {
      case 'input':
        return 'Enter amount to bond';
      case 'approving':
        return 'Approving USDC...';
      case 'bonding':
        return 'Bonding tokens...';
      case 'success':
        return 'Bonding successful!';
      case 'error':
        return 'Bonding failed';
      default:
        return '';
    }
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
      minHeight: 340,
      border: `1px solid ${theme.modalButton}`,
      boxSizing: 'border-box',
      fontFamily: 'Inter, sans-serif',
    }}>
      <TabSwitcher tab={tab} setTab={setTab} />
      {tab === 'wallet' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 340 }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Crypto Bonding</div>
          <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 16, textAlign: 'center' }}>
            Swap USDC for discounted <b>$FVC</b> with vesting
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
            <>
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
              <FVCOutput fvcAmount={fvcAmount} currentDiscount={Number(discount || 0)} />

              {/* Error Message */}
              {errorMessage && (
                <div style={{ 
                  color: '#ef4444', 
                  fontSize: 14, 
                  marginTop: 8,
                  textAlign: 'center'
                }}>
                  {errorMessage}
                </div>
              )}

              {/* Step Message */}
              {step !== 'input' && (
                <div style={{ 
                  color: step === 'success' ? '#10b981' : step === 'error' ? '#ef4444' : '#3b82f6', 
                  fontSize: 14, 
                  marginTop: 8,
                  textAlign: 'center'
                }}>
                  {getStepMessage()}
                </div>
              )}

              {/* Bond Button */}
              <button
                onClick={handleBond}
                disabled={isApproving || isBonding || !bondAmount || !address}
                style={{
                  background: isApproving || isBonding ? theme.secondaryText : theme.generalButton,
                  color: theme.buttonText,
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: isApproving || isBonding || !bondAmount || !address ? 'not-allowed' : 'pointer',
                  opacity: isApproving || isBonding || !bondAmount || !address ? 0.6 : 1,
                  marginTop: 16,
                  width: '100%',
                }}
              >
                {isApproving ? 'Approving...' : isBonding ? 'Bonding...' : 'Bond USDC'}
              </button>

              {/* Success State */}
              {step === 'success' && (
                <button
                  onClick={resetFlow}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: 8,
                  }}
                >
                  Bond More
                </button>
              )}
            </>
          )}
        </div>
      )}
      {tab === 'card' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 340 }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Card Payment</div>
          <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 16, textAlign: 'center' }}>
            Pay with card to purchase FVCG tokens
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
      <BondingTerms />
    </div>
  );
};

export default TradingCard; 