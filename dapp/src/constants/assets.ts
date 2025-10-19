/**
 * Asset constants for the FVC Protocol
 * @module constants/assets
 */

import { Asset } from '@/types';

/**
 * USDC asset configuration
 */
export const USDC_ASSET: Asset = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: (process.env.NEXT_PUBLIC_NETWORK === 'testnet' 
    ? (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174')
    : (process.env.NEXT_PUBLIC_MAINNET_USDC_ADDRESS || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174')) as `0x${string}`, // Dynamic USDC address
  decimals: 6,
  logo: '/assets/usdc.svg',
  color: '#2775CA',
};

/**
 * ETH asset configuration
 */
export const ETH_ASSET: Asset = {
  symbol: 'ETH',
  name: 'Ethereum',
  address: '0x0000000000000000000000000000000000000000', // Native ETH
  decimals: 18,
  logo: '/assets/eth.svg',
  color: '#627EEA',
};

/**
 * FVC asset configuration (governance token)
 */
export const FVC_ASSET: Asset = {
  symbol: 'FVC',
  name: 'First Venture Capital',
  address: (process.env.NEXT_PUBLIC_FVC_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F') as `0x${string}`, // FVC token address from env
  decimals: 18,
  logo: '/assets/fvc.svg',
  color: '#38BDF8',
};

/**
 * All available assets
 */
export const ASSETS: Asset[] = [
  USDC_ASSET,
  ETH_ASSET,
  FVC_ASSET,
];

/**
 * Asset lookup by symbol
 */
export const ASSET_BY_SYMBOL: Record<string, Asset> = {
  USDC: USDC_ASSET,
  ETH: ETH_ASSET,
  FVC: FVC_ASSET,
};

/**
 * Gets asset by symbol
 * @param symbol - Asset symbol
 * @returns Asset configuration or undefined if not found
 */
export function getAssetBySymbol(symbol: string): Asset | undefined {
  return ASSETS.find(asset => asset.symbol === symbol);
}

/**
 * Gets asset by address
 * @param address - Asset contract address
 * @returns Asset configuration or undefined if not found
 */
export function getAssetByAddress(address: string): Asset | undefined {
  return ASSETS.find(asset => asset.address.toLowerCase() === address.toLowerCase());
} 