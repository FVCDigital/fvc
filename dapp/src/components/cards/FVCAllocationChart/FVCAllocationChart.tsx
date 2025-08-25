'use client';

import { useState, useEffect } from 'react';
import { parseEther } from 'viem';
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

  useEffect(() => {
    // Use hardcoded target allocation based on updated whitepaper
    const TARGET_TOTAL_SUPPLY = parseEther("1000000000"); // 1B
    const TARGET_BONDING = parseEther("225000000"); // 225M (22.5%)
    const TARGET_FOUNDERS_TEAM = parseEther("170000000"); // 170M (17.0%)
    const TARGET_TREASURY = parseEther("250000000"); // 250M (25.0%) - Adjusted to make total = 1B
    const TARGET_MARKETING = parseEther("305000000"); // 305M (30.5%)
    const TARGET_LIQUIDITY = parseEther("50000000"); // 50M (5.0%)

    // Verify total adds up to 1B
    const totalAllocated = TARGET_BONDING + TARGET_FOUNDERS_TEAM + TARGET_TREASURY + TARGET_MARKETING + TARGET_LIQUIDITY;
    console.log('Total allocated:', formatEther(totalAllocated), 'FVC'); // Should be 1B

    // Calculate actual percentages based on real values
    const data: AllocationData[] = [
      {
        name: 'Private Sale',
        value: Number(formatEther(TARGET_BONDING)),
        percentage: Number((TARGET_BONDING * 10000n) / TARGET_TOTAL_SUPPLY) / 100, // Preserve 2 decimal places
        color: '#3B82F6', // Blue
      },
      {
        name: 'Founders, Team & Partners',
        value: Number(formatEther(TARGET_FOUNDERS_TEAM)),
        percentage: Number((TARGET_FOUNDERS_TEAM * 10000n) / TARGET_TOTAL_SUPPLY) / 100, // Preserve 2 decimal places
        color: '#10B981', // Green
      },
      {
        name: 'Treasury & Reserve Buffer',
        value: Number(formatEther(TARGET_TREASURY)),
        percentage: Number((TARGET_TREASURY * 10000n) / TARGET_TOTAL_SUPPLY) / 100, // Preserve 2 decimal places
        color: '#F59E0B', // Amber
      },
      {
        name: 'Marketing & Community',
        value: Number(formatEther(TARGET_MARKETING)),
        percentage: Number((TARGET_MARKETING * 10000n) / TARGET_TOTAL_SUPPLY) / 100, // Preserve 2 decimal places
        color: '#EF4444', // Red
      },
      {
        name: 'Liquidity Provision',
        value: Number(formatEther(TARGET_LIQUIDITY)),
        percentage: Number((TARGET_LIQUIDITY * 10000n) / TARGET_TOTAL_SUPPLY) / 100, // Preserve 2 decimal places
        color: '#8B5CF6', // Purple
      },
    ];

    setAllocationData(data);
    setTotalSupply(TARGET_TOTAL_SUPPLY);
  }, []); // Empty dependency array - runs once on mount

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

  // Helper function to format ether values
  const formatEther = (value: bigint) => {
    return Number(value) / 1e18;
  };

  return (
    <div style={{
      background: theme.modalBackground,
      color: theme.primaryText,
      borderRadius: 16,
      padding: 28,
      fontWeight: 500,
      fontSize: 20,
      boxShadow: `0 4px 24px ${theme.accentGlow}`,
      margin: '16px auto',
      maxWidth: 'min(600px, 90vw)',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      border: `1px solid ${theme.darkBorder}`,
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
                {item.percentage}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${theme.darkBorder}`, width: '100%' }}>
        <div style={{ padding: 12, background: theme.accentGlow, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: theme.secondaryText, lineHeight: 1.4 }}>
            <strong>Note:</strong> This shows the updated allocation from the latest whitepaper. 
            Total supply: 1B FVC, Private Sale: 225M FVC (22.5%), Founders & Team: 170M FVC (17.0%), 
            Treasury: 250M FVC (25.0%), Marketing: 305M FVC (30.5%), Liquidity: 50M FVC (5.0%).
            Total: 1B FVC (100%).
          </div>
        </div>
      </div>
    </div>
  );
};

export default FVCAllocationChart;
