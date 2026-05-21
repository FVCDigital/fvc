import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';

interface MoonPayConfig {
  onClose?: () => void;
  onSuccess?: (data: MoonPayTransactionData) => void;
  onError?: (error: Error) => void;
}

interface MoonPayTransactionData {
  transactionId: string;
  cryptoCurrency: string;
  cryptoAmount: number;
  fiatCurrency: string;
  fiatAmount: number;
  walletAddress: string;
  status: string;
}

interface UseMoonPayReturn {
  openMoonPay: (amount: number, currency: 'USDC' | 'USDT' | 'ETH') => void;
  isMoonPayOpen: boolean;
  closeMoonPay: () => void;
  isLoading: boolean;
  isSupported: boolean;
}

type MoonPayCurrencyCode = 'usdc_ethereum' | 'usdt_ethereum' | 'eth';

const CURRENCY_MAP: Record<'USDC' | 'USDT' | 'ETH', MoonPayCurrencyCode> = {
  USDC: 'usdc_ethereum',
  USDT: 'usdt_ethereum',
  ETH: 'eth',
};

/**
 * MoonPay Integration Hook
 * 
 * Handles fiat-to-crypto purchases via MoonPay widget.
 * Users buy USDC/USDT/ETH directly to their wallet, then purchase FVC.
 * 
 * @example
 * const { openMoonPay, isMoonPayOpen, isLoading } = useMoonPay({
 *   onSuccess: (data) => console.log('Purchase complete', data),
 *   onClose: () => console.log('Widget closed'),
 * });
 * 
 * // Open widget for $100 USDC purchase
 * openMoonPay(100, 'USDC');
 */
export const useMoonPay = (config?: MoonPayConfig): UseMoonPayReturn => {
  const { address } = useAccount();
  const [isMoonPayOpen, setIsMoonPayOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const widgetRef = useRef<any>(null);
  const moonPayRef = useRef<any>(null);

  const apiKey = process.env.NEXT_PUBLIC_MOONPAY_API_KEY;
  const environment = (process.env.NEXT_PUBLIC_MOONPAY_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadMoonPaySDK = async () => {
      try {
        if ((window as any).MoonPayWebSdk) {
          moonPayRef.current = (window as any).MoonPayWebSdk;
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://static.moonpay.com/web-sdk/v1/moonpay-web-sdk.min.js';
        script.async = true;
        script.defer = true;

        script.onload = () => {
          moonPayRef.current = (window as any).MoonPayWebSdk;
        };

        script.onerror = () => {
          console.error('Failed to load MoonPay SDK');
          setIsSupported(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('MoonPay SDK loading error:', error);
        setIsSupported(false);
      }
    };

    loadMoonPaySDK();

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.close?.();
        } catch {
          // Widget may already be closed
        }
      }
    };
  }, []);

  const openMoonPay = useCallback((amount: number, currency: 'USDC' | 'USDT' | 'ETH' = 'USDC') => {
    if (!apiKey) {
      console.error('MoonPay API key not configured');
      config?.onError?.(new Error('MoonPay is not configured. Please contact support.'));
      return;
    }

    if (!address) {
      config?.onError?.(new Error('Please connect your wallet first'));
      return;
    }

    if (amount < 20) {
      config?.onError?.(new Error('Minimum purchase amount is $20'));
      return;
    }

    if (!moonPayRef.current) {
      console.error('MoonPay SDK not loaded');
      config?.onError?.(new Error('MoonPay is loading. Please try again.'));
      return;
    }

    setIsLoading(true);

    try {
      const currencyCode = CURRENCY_MAP[currency];

      const widget = moonPayRef.current({
        flow: 'buy',
        environment,
        variant: 'overlay',
        params: {
          apiKey,
          currencyCode,
          walletAddress: address,
          baseCurrencyCode: 'usd',
          baseCurrencyAmount: String(amount),
          colorCode: '#6A70E4',
          theme: 'dark',
          language: 'en',
        },
        handlers: {
          async onTransactionCompleted(props: any) {
            console.log('MoonPay transaction completed:', props);
            setIsMoonPayOpen(false);
            setIsLoading(false);
            
            const transactionData: MoonPayTransactionData = {
              transactionId: props.transactionId || props.id || '',
              cryptoCurrency: props.cryptoCurrency || currency,
              cryptoAmount: props.cryptoAmount || props.quoteCurrencyAmount || 0,
              fiatCurrency: props.fiatCurrency || props.baseCurrency || 'USD',
              fiatAmount: props.fiatAmount || props.baseCurrencyAmount || amount,
              walletAddress: props.walletAddress || address,
              status: props.status || 'completed',
            };
            
            config?.onSuccess?.(transactionData);
          },
          async onTransactionUpdated(props: any) {
            console.log('MoonPay transaction updated:', props);
          },
        },
        listeners: {
          onCloseOverlay: () => {
            console.log('MoonPay widget closed');
            setIsMoonPayOpen(false);
            setIsLoading(false);
            config?.onClose?.();
          },
        },
      });

      widgetRef.current = widget;
      widget.show();
      setIsMoonPayOpen(true);
      setIsLoading(false);
    } catch (error) {
      console.error('MoonPay widget error:', error);
      setIsLoading(false);
      config?.onError?.(error instanceof Error ? error : new Error('Failed to open MoonPay'));
    }
  }, [address, apiKey, environment, config]);

  const closeMoonPay = useCallback(() => {
    if (widgetRef.current) {
      try {
        widgetRef.current.close?.();
      } catch {
        // Widget may already be closed
      }
      setIsMoonPayOpen(false);
    }
  }, []);

  return {
    openMoonPay,
    isMoonPayOpen,
    closeMoonPay,
    isLoading,
    isSupported,
  };
};

export default useMoonPay;
