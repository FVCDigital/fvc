import { useAccount, useConnect, useDisconnect } from 'wagmi';

const ConnectWalletButton: React.FC = () => {
  const { isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Find the injected connector (MetaMask, browser wallets)
  const injectedConnector = connectors.find((c) => c.id === 'injected');

  return (
    <div className="w-full flex justify-center">
      {!isConnected ? (
        <button
          className="w-full max-w-xs text-lg font-semibold rounded-xl neon-glow mt-2 mb-2 bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] text-white px-8 py-3 shadow-lg transition hover:from-[#38bdf8] hover:to-[#0ea5e9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] focus:ring-offset-2"
          onClick={() => injectedConnector && connect({ connector: injectedConnector })}
          disabled={isPending || !injectedConnector}
        >
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <button
          className="w-full max-w-xs text-lg font-semibold rounded-xl neon-glow mt-2 mb-2 bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] text-white px-8 py-3 shadow-lg transition hover:from-[#38bdf8] hover:to-[#0ea5e9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] focus:ring-offset-2"
          onClick={() => disconnect()}
        >
          Disconnect
        </button>
      )}
    </div>
  );
};

export default ConnectWalletButton; 