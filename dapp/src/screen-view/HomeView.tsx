import React from 'react';

interface HomeViewProps {
  isConnected: boolean;
  address?: string;
  totalSupply?: any;
  balance?: any;
}

const HomeView: React.FC<HomeViewProps> = ({ isConnected, address, totalSupply, balance }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-4">Hello World, FVC Protocol!</h1>
    <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
    <p>Your address: {address ?? 'Not connected'}</p>
    <p>Total Supply: {totalSupply ? totalSupply.toString() : 'Loading...'}</p>
    <p>Your FVC Balance: {balance ? balance.toString() : 'Loading...'}</p>
  </div>
);

export default HomeView; 