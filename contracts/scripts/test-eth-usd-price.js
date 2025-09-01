const { ethers } = require("hardhat");

async function main() {
  // Bonding contract address (you'll need to update this with the actual deployed address)
  const bondingContractAddress = "0x..."; // Update with actual address
  
  // Bonding contract ABI (minimal for testing)
  const bondingABI = [
    {
      "inputs": [],
      "name": "getEthUsdPrice",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "ethUsdPrice",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCurrentPrices",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "usdcPricePerFVC",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "ethPricePerFVC",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];
  
  try {
    console.log("Testing ETH/USD price function...");
    console.log("Note: Update the bondingContractAddress with the actual deployed address");
    
    // Uncomment and update the address to test
    /*
    const bondingContract = await ethers.getContractAt(bondingABI, bondingContractAddress);
    
    // Get ETH/USD price
    const ethUsdPrice = await bondingContract.getEthUsdPrice();
    console.log("ETH/USD Price:", ethers.formatUnits(ethUsdPrice, 18));
    
    // Get current prices
    const currentPrices = await bondingContract.getCurrentPrices();
    console.log("USDC Price per FVC:", ethers.formatUnits(currentPrices.usdcPricePerFVC, 6));
    console.log("ETH Price per FVC:", ethers.formatUnits(currentPrices.ethPricePerFVC, 18));
    */
    
    console.log("Test completed. Update the contract address to run the actual test.");
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
