// Ethereum Mainnet contract address configuration

export const CONTRACT_ADDRESSES = {
  // Ethereum Mainnet (1)
  1: {
    FVC: (process.env.NEXT_PUBLIC_FVC_ADDRESS || '') as `0x${string}`,
    Sale: (process.env.NEXT_PUBLIC_SALE_ADDRESS || '') as `0x${string}`,
    Staking: (process.env.NEXT_PUBLIC_STAKING_ADDRESS || '') as `0x${string}`,
    Vesting: (process.env.NEXT_PUBLIC_VESTING_ADDRESS || '') as `0x${string}`,
    USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48') as `0x${string}`,
  },
} as const;

export type ChainId = keyof typeof CONTRACT_ADDRESSES;
export type ContractName = keyof typeof CONTRACT_ADDRESSES[ChainId];

export function getContractAddress(
  chainId: ChainId,
  contractName: ContractName
): `0x${string}` | '' {
  return CONTRACT_ADDRESSES[chainId]?.[contractName] || '';
}

export function isContractDeployed(
  chainId: ChainId,
  contractName: ContractName
): boolean {
  const address = getContractAddress(chainId, contractName);
  return address !== '';
}

export function getChainAddresses(chainId: ChainId) {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[1];
}
