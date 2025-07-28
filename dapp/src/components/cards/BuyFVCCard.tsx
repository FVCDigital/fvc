import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { theme } from '@/constants/theme';
import { parseUnits, formatUnits } from 'viem';

interface BuyFVCCardProps {
  className?: string;
}

const BuyFVCCard: React.FC<BuyFVCCardProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Mock exchange rate: 1 USDC = 1 FVC (for demo purposes)
  const exchangeRate = 1;
  const fvcAmount = usdcAmount ? (parseFloat(usdcAmount) * exchangeRate).toFixed(4) : '';

  const handleBuy = async () => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setUsdcAmount('');
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    }, 2000);
  };

  if (!address) {
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
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Buy FVC</div>
        <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
          Connect your wallet to buy FVC tokens
        </div>
      </div>
    );
  }

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Buy FVC</div>
        <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 16, textAlign: 'center' }}>
          Purchase FVC tokens with USDC
        </div>

        {/* Exchange Rate Info */}
        <div style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 10,
          border: `1.5px solid ${theme.modalButton}`,
          background: theme.appBackground,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 4 }}>Exchange Rate</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: theme.primaryText }}>
            1 USDC = 1 FVC
          </div>
        </div>

        {/* USDC Input */}
        <div style={{
          width: '100%',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>USDC Amount</div>
          <input
            type="number"
            placeholder="0.00"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: `1.5px solid ${theme.modalButton}`,
              background: theme.appBackground,
              color: theme.primaryText,
              fontSize: 18,
              boxSizing: 'border-box',
              fontFamily: 'Inter, sans-serif',
            }}
          />
        </div>

        {/* FVC Output */}
        {fvcAmount && (
          <div style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: `1.5px solid ${theme.modalButton}`,
            background: theme.appBackground,
            marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 4 }}>You will receive</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: theme.primaryText }}>
              {fvcAmount} FVC
            </div>
          </div>
        )}

        {/* Success Message */}
        {isSuccess && (
          <div style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(16,185,129,0.1)',
            border: '1.5px solid #10b981',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#10b981' }}>
              ✅ Purchase successful! FVC tokens added to your wallet.
            </div>
          </div>
        )}

        {/* Buy Button */}
        <button
          onClick={handleBuy}
          disabled={isProcessing || !usdcAmount || parseFloat(usdcAmount) <= 0}
          style={{
            width: '100%',
            padding: '12px 24px',
            borderRadius: 8,
            background: isProcessing ? theme.secondaryText : theme.generalButton,
            color: theme.buttonText,
            border: 'none',
            fontSize: 16,
            fontWeight: 600,
            cursor: isProcessing || !usdcAmount || parseFloat(usdcAmount) <= 0 ? 'not-allowed' : 'pointer',
            opacity: isProcessing || !usdcAmount || parseFloat(usdcAmount) <= 0 ? 0.6 : 1,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {isProcessing ? 'Processing...' : 'Buy FVC'}
        </button>

        {/* Disclaimer */}
        <div style={{
          fontSize: 12,
          color: theme.secondaryText,
          textAlign: 'center',
          marginTop: 16,
          lineHeight: 1.4,
        }}>
          This is a demo purchase using fake USDC and FVC tokens. No real transactions will occur.
        </div>
      </div>
    </div>
  );
};

export default BuyFVCCard; 