import React, { useState } from 'react';
import { theme } from '@/constants/theme';
import { useAccount, useBalance } from 'wagmi';
import TabSwitcher from './TabSwitcher';
import AssetSelector from './AssetSelector';
import BondingProgressBar from './BondingProgressBar';
import AmountInput from './AmountInput';
import FVCGOutput from './FVCGOutput';
import CardPaymentForm from './CardPaymentForm';
import BondingTerms from './BondingTerms';
import usePolygonId from '@/utils/hooks/useKYC';
import { KYCButton } from '@/components/cards';

const ASSETS = [
  { symbol: 'ETH', name: 'Ethereum', address: undefined },
  { symbol: 'USDC', name: 'USD Coin', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
  { symbol: 'POL', name: 'Polygon', address: undefined },
];

const percentButtons = [0, 50, 100];

const TradingCard: React.FC<{ mode?: 'crypto' }> = ({ mode }) => {
  const [tab, setTab] = useState<'wallet' | 'card'>('wallet');
  const { address } = useAccount();
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const balanceArgs = selectedAsset.symbol === 'POL' ? { address } : selectedAsset.address ? { address, token: selectedAsset.address as `0x${string}` } : { address };
  const { data: balance, isLoading } = useBalance(balanceArgs);
  const [input, setInput] = useState('');
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  // KYC KYC
  const { isVerified, triggerVerification, QrModal } = usePolygonId();
  const [showKycModal, setShowKycModal] = useState(false);

  // Placeholder bonding round data
  const bondingProgress = 0.6; // 60% sold
  const currentDiscount = 20; // 20% discount
  // Calculate FVCG output (placeholder logic)
  const fvcgAmount = input && !isNaN(Number(input)) ? (Number(input) / (1 - currentDiscount / 100)).toFixed(4) : '';

  const handlePercent = (pct: number) => {
    if (!balance) return;
    const value = (Number(balance.formatted) * pct / 100).toFixed(6);
    setInput(value);
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
            Swap from your connected wallet for discounted <b>$FVC</b>.<br/>
            (Trading UI coming soon)
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
              <AssetSelector assets={ASSETS} selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} />
              <BondingProgressBar progress={bondingProgress} />
              <AmountInput input={input} setInput={setInput} balance={balance} isLoading={isLoading} selectedAsset={selectedAsset} handlePercent={handlePercent} />
              <FVCGOutput fvcgAmount={fvcgAmount} currentDiscount={currentDiscount} />
            </>
          )}
        </div>
      )}
      {tab === 'card' && (
        <CardPaymentForm cardNumber={cardNumber} setCardNumber={setCardNumber} expiry={expiry} setExpiry={setExpiry} cvc={cvc} setCvc={setCvc} />
      )}
      <BondingTerms />
    </div>
  );
};

export default TradingCard; 