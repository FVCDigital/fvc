'use client';

import { useReadContract } from 'wagmi';
import { FVC_ABI, FVC_CONTRACT } from '@/utils/contracts/fvc';
import { BONDING_ABI, BONDING_CONTRACT } from '@/utils/contracts/bondingContract';
import { useState, useEffect } from 'react';
import { formatEther, parseEther } from 'viem';
import { theme } from '@/constants/theme';

interface AllocationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

const FVCAllocationChart = () => {
  const [allocationData, setAllocationData] = useState<AllocationData[]>([]);
  const [totalSupply, setTotalSupply] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(true);

  // Read total FVC supply
  const { data: fvcTotalSupply } = useReadContract({
    address: FVC_CONTRACT,
    abi: FVC_ABI,
    functionName: 'totalSupply',
  });

  // Read bonding contract FVC balance
  const { data: bondingBalance } = useReadContract({
    address: FVC_CONTRACT,
    abi: FVC_ABI,
    functionName: 'balanceOf',
    args: [BONDING_CONTRACT],
  });

  useEffect(() => {
    if (fvcTotalSupply && bondingBalance) {
      // Show target allocation: 1B total, 300M bonding, 700M unallocated
      const TARGET_TOTAL_SUPPLY = parseEther("1000000000"); // 1B
      const TARGET_BONDING = parseEther("300000000"); // 300M
      const TARGET_UNALLOCATED = parseEther("700000000"); // 700M

      const data: AllocationData[] = [
        {
          name: 'Bonding Contract',
          value: Number(formatEther(TARGET_BONDING)),
          percentage: Number((TARGET_BONDING * 100n) / TARGET_TOTAL_SUPPLY),
          color: '#3B82F6', // Blue
        },
        {
          name: 'Unallocated',
          value: Number(formatEther(TARGET_UNALLOCATED)),
          percentage: Number((TARGET_UNALLOCATED * 100n) / TARGET_TOTAL_SUPPLY),
          color: '#10B981', // Green
        },
      ];

      setAllocationData(data);
      setTotalSupply(TARGET_TOTAL_SUPPLY);
      setIsLoading(false);
    }
  }, [fvcTotalSupply, bondingBalance]);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(0)}B`;
    } else if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  if (isLoading) {
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
        maxWidth: 'min(600px, 90vw)',
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
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>FVC Allocation Distribution</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
          <div style={{ 
            animation: 'spin 1s linear infinite',
            borderRadius: '50%',
            height: 32,
            width: 32,
            border: `2px solid ${theme.modalButton}`,
            borderTopColor: theme.generalButton,
          }}></div>
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
      maxWidth: 'min(600px, 90vw)',
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
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>FVC Allocation Distribution</div>
      
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: theme.secondaryText }}>
          Total Supply: <span style={{ fontWeight: 600, color: theme.primaryText }}>{formatNumber(Number(formatEther(totalSupply)))} FVC</span>
        </div>
      </div>

      {/* Pie Chart */}
      <div style={{ position: 'relative', width: '256px', height: '256px', margin: '0 auto 24px' }}>
        <svg width="256" height="256" viewBox="0 0 256 256" style={{ transform: 'rotate(-90deg)' }}>
          {allocationData.map((item, index) => {
            const radius = 100;
            const centerX = 128;
            const centerY = 128;
            
            // Calculate angles - ensure they add up to 100%
            let startAngle = 0;
            let endAngle = 0;
            
            if (index === 0) {
              // First segment starts at 0
              startAngle = 0;
              endAngle = item.percentage * 3.6; // Convert percentage to degrees
            } else {
              // Subsequent segments start where the previous one ended
              const previousEndAngle = allocationData.slice(0, index).reduce((sum, prevItem) => sum + prevItem.percentage, 0) * 3.6;
              startAngle = previousEndAngle;
              endAngle = previousEndAngle + (item.percentage * 3.6);
            }
            
            // Calculate arc coordinates
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = centerX + radius * Math.cos(startRad);
            const y1 = centerY + radius * Math.sin(startRad);
            const x2 = centerX + radius * Math.cos(endRad);
            const y2 = centerY + radius * Math.sin(endRad);
            
            const largeArcFlag = item.percentage > 50 ? 1 : 0;
            
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');

            return (
              <path
                key={item.name}
                d={pathData}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
                style={{
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              />
            );
          })}
        </svg>
        
        {/* Center text - removed for cleaner look */}
      </div>

      {/* Legend */}
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {allocationData.map((item) => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div 
                style={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: '50%', 
                  backgroundColor: item.color 
                }}
              ></div>
              <span style={{ fontSize: 14, fontWeight: 500, color: theme.primaryText }}>{item.name}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.primaryText }}>
                {formatNumber(item.value)} FVC
              </div>
              <div style={{ fontSize: 12, color: theme.secondaryText }}>
                {item.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${theme.modalButton}`, width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
          <div>
            <div style={{ color: theme.secondaryText, marginBottom: 4 }}>Bonding Contract</div>
            <div style={{ fontWeight: 600, color: theme.primaryText, fontSize: 11, wordBreak: 'break-all' }}>{BONDING_CONTRACT}</div>
          </div>
          <div>
            <div style={{ color: theme.secondaryText, marginBottom: 4 }}>FVC Contract</div>
            <div style={{ fontWeight: 600, color: theme.primaryText, fontSize: 11, wordBreak: 'break-all' }}>{FVC_CONTRACT}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(56,189,248,0.1)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: theme.secondaryText, lineHeight: 1.4 }}>
            <strong>Note:</strong> This shows the target allocation. 
            Total supply: 1B FVC, Bonding: 300M FVC (30%), Unallocated: 700M FVC (70%).
            The current blockchain state has excess tokens due to testnet minting.
          </div>
        </div>
      </div>
    </div>
  );
};

export default FVCAllocationChart;
