// Multi-chain contract address configuration
// Addresses are automatically selected based on connected wallet chain

export const CONTRACT_ADDRESSES = {
  // Polygon Amoy Testnet (80002) - PRIMARY
  80002: {
    FVC: '0x7dA82193bf0671Bb1683Dd6488E914436827ae8e',
    Sale: '0xd59b3F0EA3Daa359Ec799EB77c36a7bF8926c812',
    Staking: '0x404307557837CDe827f7B4bbb5ea12bD69a6F7F5',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  // Base Sepolia Testnet (84532)
  84532: {
    FVC: '0x6c44664be09dC32dF8b7B03dAC3d65D1984358fF',
    Sale: '0x0b98e70EC5dae765c5a361c5EDFBB856787fb56A',
    Staking: '0xAA8C1C430634D16b37f8132c88607EfA1924c064',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  // BNB Testnet (97)
  97: {
    FVC: '0x0b98e70EC5dae765c5a361c5EDFBB856787fb56A',
    Sale: '0xAA8C1C430634D16b37f8132c88607EfA1924c064',
    Staking: '0x18E68709b00b792429aF671a7ADd0Ac0D2dF335A',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
} as const;

export type ChainId = keyof typeof CONTRACT_ADDRESSES;
export type ContractName = keyof typeof CONTRACT_ADDRESSES[ChainId];

/**
 * Get contract address for specific chain
 * @param chainId - Chain ID (80002, 84532, or 97)
 * @param contractName - Contract name (FVC, Sale, Staking, USDC)
 * @returns Contract address or empty string if not deployed
 */
export function getContractAddress(
  chainId: ChainId,
  contractName: ContractName
): `0x${string}` | '' {
  return CONTRACT_ADDRESSES[chainId]?.[contractName] || '';
}

/**
 * Check if contract is deployed on chain
 * @param chainId - Chain ID
 * @param contractName - Contract name
 * @returns true if deployed, false otherwise
 */
export function isContractDeployed(
  chainId: ChainId,
  contractName: ContractName
): boolean {
  const address = getContractAddress(chainId, contractName);
  return address !== '';
}

/**
 * Get all contract addresses for a chain
 * @param chainId - Chain ID
 * @returns Object with all contract addresses
 */
export function getChainAddresses(chainId: ChainId) {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[80002]; // Fallback to Polygon Amoy
}
