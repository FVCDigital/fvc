import { useAccount, useBalance, useContractRead } from 'wagmi';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, BONDING_ABI, USDC_ABI } from '../contracts/bondingContract';
import { parseUnits, formatUnits } from 'viem';
import { useState, useEffect } from 'react';

// Mock balance provider for testing
export const useMockUSDCBalance = () => {
  return {
    data: {
      formatted: '1000.0',
      value: parseUnits('1000', 6),
      decimals: 6,
      symbol: 'USDC',
    },
    isLoading: false,
  };
};

// Hook for USDC approval
export const useApproveUSDC = (amount: string) => {
  const { address } = useAccount();
  
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const { isLoading: isWaiting, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  const handleApprove = async () => {
    if (!amount || !address) return;
    
    // Use the correct USDC address based on environment
    const usdcAddress = 'USDC' in CONTRACTS ? CONTRACTS.USDC : CONTRACTS.MOCK_USDC;
    
    writeContract({
      address: usdcAddress as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [
        CONTRACTS.BONDING as `0x${string}`,
        parseUnits(amount, 6) // USDC has 6 decimals
      ],
    });
  };

  return {
    approve: handleApprove,
    isLoading: isPending || isWaiting,
    isSuccess,
    isError,
    error,
    hash,
  };
};

// Hook for bonding with different assets
export const useBond = (amount: string, asset: any, fvcAmount?: string) => {
  const { address } = useAccount();
  
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const { isLoading: isWaiting, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  const handleBond = async (passedFvcAmount?: string) => {
    if (!amount || !address) return;
    
    const finalFvcAmount = passedFvcAmount || fvcAmount;
    
    if (asset.symbol === 'ETH') {
      // For ETH bonding, use the new bondWithETH function
      if (!finalFvcAmount) {
        console.error('FVC amount is required for ETH bonding');
        return;
      }
      
      writeContract({
        address: CONTRACTS.BONDING as `0x${string}`,
        abi: BONDING_ABI,
        functionName: 'bondWithETH',
        args: [parseUnits(finalFvcAmount, 18)], // FVC amount in 18 decimals
        value: parseUnits(amount, 18), // ETH amount in wei
      });
    } else {
      // For USDC, send amount as parameter
      writeContract({
        address: CONTRACTS.BONDING as `0x${string}`,
        abi: BONDING_ABI,
        functionName: 'bond',
        args: [parseUnits(amount, 6)], // USDC has 6 decimals
      });
    }
  };

  return {
    bond: handleBond,
    isLoading: isPending || isWaiting,
    isSuccess,
    isError,
    error,
    hash,
  };
};

// Complete bonding flow handler
export const useBondingFlow = (selectedAsset?: any) => {
  const { address } = useAccount();
  const [bondAmount, setBondAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approving' | 'bonding' | 'success' | 'error'>('input');
  const [errorMessage, setErrorMessage] = useState('');

  // Only use approval for USDC
  const {
    approve,
    isLoading: isApproving,
    isSuccess: isApproved,
    isError: isApprovalError,
    error: approvalError,
  } = useApproveUSDC(bondAmount);

  // Bonding hook with asset parameter
  const {
    bond,
    isLoading: isBonding,
    isSuccess: isBonded,
    isError: isBondError,
    error: bondError,
  } = useBond(bondAmount, selectedAsset);

  // Handle approval (only for USDC)
  const handleApprove = async () => {
    if (!bondAmount || !address) {
      setErrorMessage('Please enter an amount and connect wallet');
      return;
    }

    setStep('approving');
    setErrorMessage('');
    
    try {
      await approve();
    } catch (error) {
      setStep('error');
      setErrorMessage('Approval failed');
    }
  };

  // Handle bonding
  const handleBond = async (fvcAmount?: string) => {
    if (!bondAmount || !address) {
      setErrorMessage('Please enter an amount and connect wallet');
      return;
    }

    setStep('bonding');
    setErrorMessage('');
    
    try {
      await bond(fvcAmount);
    } catch (error) {
      setStep('error');
      setErrorMessage('Bonding failed');
    }
  };

  // Reset flow
  const resetFlow = () => {
    setStep('input');
    setErrorMessage('');
    setBondAmount('');
  };

  // Auto-proceed to bonding after approval (USDC only)
  useEffect(() => {
    if (isApproved && step === 'approving') {
      setStep('bonding');
      handleBond();
    }
  }, [isApproved]);

  // Handle success
  useEffect(() => {
    if (isBonded && step === 'bonding') {
      setStep('success');
    }
  }, [isBonded]);

  // Handle errors
  useEffect(() => {
    if (isApprovalError && step === 'approving') {
      setStep('error');
      setErrorMessage(approvalError?.message || 'Approval failed');
    }
    if (isBondError && step === 'bonding') {
      setStep('error');
      setErrorMessage(bondError?.message || 'Bonding failed');
    }
  }, [isApprovalError, isBondError, approvalError, bondError]);

  return {
    bondAmount,
    setBondAmount,
    step,
    errorMessage,
    handleApprove,
    handleBond,
    resetFlow,
    isApproving,
    isBonding,
    isApproved,
    isBonded,
  };
}; 

export const useBondingContractBalance = () => {
  // Determine correct FVC address for all environments
  let fvcAddress: string = '';
  if ('FVC' in CONTRACTS) {
    fvcAddress = (CONTRACTS as any).FVC;
  } else if ('MOCK_FVC' in CONTRACTS) {
    fvcAddress = (CONTRACTS as any).MOCK_FVC;
  }

  const { data: balance, isLoading, error } = useBalance({
    address: CONTRACTS.BONDING as `0x${string}`,
    token: fvcAddress as `0x${string}`,
  });

  return {
    bondingContractBalance: balance?.value || 0n,
    isLoading,
    error,
  };
}; 