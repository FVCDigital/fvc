import React from 'react';
import { HomeContainer, HomeTitle, Paragraph } from '@/components/atomic';

interface HomeViewProps {
  isConnected: boolean;
  address?: string;
  totalSupply?: string | number;
  balance?: string | number;
}

const HomeView: React.FC<HomeViewProps> = ({ isConnected, address, totalSupply, balance }) => (
  <HomeContainer>
    <HomeTitle>Hello World, FVC Protocol!</HomeTitle>
    <Paragraph>Connected: {isConnected ? 'Yes' : 'No'}</Paragraph>
    <Paragraph>Your address: {address ?? 'Not connected'}</Paragraph>
    <Paragraph>Total Supply: {totalSupply !== undefined ? totalSupply.toString() : 'Loading...'}</Paragraph>
    <Paragraph>Your FVC Balance: {balance !== undefined ? balance.toString() : 'Loading...'}</Paragraph>
  </HomeContainer>
);

export default HomeView; 