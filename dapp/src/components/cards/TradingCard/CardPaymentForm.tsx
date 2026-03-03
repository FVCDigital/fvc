import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import useTransak from '@/utils/hooks/useTransak';

interface CardPaymentFormProps {
  bondAmount?: string;
  selectedAsset?: { symbol: string; name: string };
  onSuccess?: () => void;
}

/**
 * Card Payment Form - Transak Integration
 * 
 * Allows users to purchase USDC/ETH with credit card via Transak
 * After purchase, crypto arrives in wallet and user can bond for FVC
 */
const CardPaymentForm: React.FC<CardPaymentFormProps> = ({ 
  bondAmount, 
  selectedAsset,
  onSuccess 
}) => {
  const { address } = useAccount();
  const [selectedCurrency, setSelectedCurrency] = useState<'USDC' | 'ETH'>('USDC');
  const [usdAmount, setUsdAmount] = useState(bondAmount || '100');

  const { openTransak, isTransakOpen, isLoading } = useTransak({
    onSuccess: (data) => {
      console.log('Transak purchase successful:', data);
      onSuccess?.();
    },
    onClose: () => {
      console.log('Transak widget closed');
    },
    onError: (error) => {
      console.error('Transak error:', error);
    },
  });

  const handleBuyWithCard = () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(usdAmount);
    if (isNaN(amount) || amount < 30) {
      alert('Minimum purchase amount is $30');
      return;
    }

    // Open Transak widget with selected currency and amount
    openTransak(amount, selectedCurrency);
  };

  const estimatedFVC = bondAmount ? parseFloat(bondAmount) * 4 : parseFloat(usdAmount) * 4;

  return (
    <div className="w-full max-w-[400px] space-y-4">
      {/* Info Banner */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-500 text-xl">ℹ️</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              <p className="font-semibold mb-1">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Purchase USDC or ETH with your card</li>
                <li>Crypto arrives in your wallet in 5-10 minutes</li>
                <li>Switch to &quot;Wallet&quot; tab to bond for FVC</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currency Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Purchase Currency
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedCurrency('USDC')}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedCurrency === 'USDC'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            <div className="font-semibold">USDC</div>
            <div className="text-xs text-muted-foreground">Stablecoin</div>
          </button>
          <button
            onClick={() => setSelectedCurrency('ETH')}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedCurrency === 'ETH'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            <div className="font-semibold">ETH</div>
            <div className="text-xs text-muted-foreground">Ethereum</div>
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Amount (USD)
        </label>
        <input
          type="number"
          value={usdAmount}
          onChange={(e) => setUsdAmount(e.target.value)}
          min="30"
          step="10"
          placeholder="100"
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Minimum: $30 • Recommended: $100+
        </p>
      </div>

      {/* Estimated FVC Output */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-1">
            After bonding, you&apos;ll receive approximately:
          </div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            ~{estimatedFVC.toFixed(2)} FVC
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            *Actual amount depends on current bonding price
          </div>
        </CardContent>
      </Card>

      {/* Buy Button */}
      <Button
        onClick={handleBuyWithCard}
        disabled={!address || isLoading || isTransakOpen}
        className="w-full h-12 text-lg font-bold"
        size="lg"
      >
        {isLoading ? (
          'Opening Transak...'
        ) : isTransakOpen ? (
          'Transak Open'
        ) : (
          `Buy ${selectedCurrency} with Card`
        )}
      </Button>

      {/* Security Info */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>🔒 Secure payment processing by Transak</p>
        <p>KYC verification required for compliance</p>
        <p>Fees apply (shown before purchase)</p>
      </div>

      {/* Powered by Transak */}
      <div className="text-center pt-2">
        <a
          href="https://transak.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-blue-500 transition-colors"
        >
          Powered by Transak
        </a>
      </div>
    </div>
  );
};

export default CardPaymentForm;
