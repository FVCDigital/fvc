import React from 'react';

const tokenMap = {
  ETH: '/assets/token-logos/eth.svg',
  USDC: '/assets/token-logos/usdc.svg',
};

interface Props {
  token: 'ETH' | 'USDC';
  size?: number;
}

export const TokenLogoWithBadge: React.FC<Props> = ({ token, size = 40 }) => {
  const tokenSrc = tokenMap[token];
  return (
    <span style={{ display: 'inline-block', width: size, height: size }}>
      <img src={tokenSrc} width={size} height={size} style={{ borderRadius: '50%', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', display: 'block' }} alt={token} />
    </span>
  );
};
