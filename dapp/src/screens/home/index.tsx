import { useAccount, useReadContract } from 'wagmi';
// import FVC_ADDRESS from '../../../../packages/shared/constants/fvc';
// import FVC_ABI from '../../../../packages/shared/abis/FVC.json';

// Placeholder values
const FVC_ADDRESS = '0x0000000000000000000000000000000000000000';
const FVC_ABI: any[] = [];

export default function HomeScreen() {
  const { address, isConnected } = useAccount();

  // Fetch total supply
  const { data: totalSupply } = useReadContract({
    address: FVC_ADDRESS,
    abi: FVC_ABI,
    functionName: 'totalSupply',
  });

  // Fetch user balance
  const { data: balance } = useReadContract({
    address: FVC_ADDRESS,
    abi: FVC_ABI,
    functionName: 'balanceOf',
    args: [address ?? '0x0'],
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Hello World, FVC Protocol!</h1>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Your address: {address ?? 'Not connected'}</p>
      <p>Total Supply: {totalSupply ? totalSupply.toString() : 'Loading...'}</p>
      <p>Your FVC Balance: {balance ? balance.toString() : 'Loading...'}</p>
    </div>
  );
}
