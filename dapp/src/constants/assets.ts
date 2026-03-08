/**
 * Asset constants for the FVC Protocol
 * @module constants/assets
 */

import { Asset } from '@/types';

export const USDC_ASSET: Asset = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48') as `0x${string}`,
  decimals: 6,
  logo: '/assets/usdc.svg',
  color: '#2775CA',
};

export const ETH_ASSET: Asset = {
  symbol: 'ETH',
  name: 'Ethereum',
  address: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  logo: '/assets/eth.svg',
  color: '#627EEA',
};

export const FVC_ASSET: Asset = {
  symbol: 'FVC',
  name: 'First Venture Capital',
  address: (process.env.NEXT_PUBLIC_FVC_ADDRESS || '') as `0x${string}`,
  decimals: 18,
  logo: '/assets/fvc.svg',
  color: '#38BDF8',
};

export const ASSETS: Asset[] = [
  USDC_ASSET,
  ETH_ASSET,
  FVC_ASSET,
];

export const ASSET_BY_SYMBOL: Record<string, Asset> = {
  USDC: USDC_ASSET,
  ETH: ETH_ASSET,
  FVC: FVC_ASSET,
};

export function getAssetBySymbol(symbol: string): Asset | undefined {
  return ASSETS.find(asset => asset.symbol === symbol);
}

export function getAssetByAddress(address: string): Asset | undefined {
  return ASSETS.find(asset => asset.address.toLowerCase() === address.toLowerCase());
}
