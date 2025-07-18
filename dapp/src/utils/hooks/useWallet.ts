import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

const useWallet = () => {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();

  const connectWallet = () => openConnectModal && openConnectModal();

  return { isConnected, address, connectWallet };
};

export default useWallet; 