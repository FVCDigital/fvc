import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

const isCoverage = process.env.COVERAGE === "true";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      // viaIR is incompatible with solidity-coverage instrumentation
      viaIR: isCoverage ? false : true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
      forking: process.env.FORK
        ? {
            url: process.env.ETHEREUM_MAINNET_RPC || "https://eth-mainnet.g.alchemy.com/v2/6tgWso4UXVZmfMyP0ErKJ",
            enabled: true,
            // Pin to block after all deployer config txs (grantRole DEFAULT_ADMIN, transferOwnership Vesting)
            blockNumber: 24579710,
          }
        : undefined,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    amoy: {
      url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 80002,
      gasPrice: 50000000000,
      gas: 5000000,
      timeout: 600000,
    },
    "polygon-amoy": {
      url: process.env.POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 80002,
      gasPrice: 50000000000,
      gas: 5000000,
      timeout: 600000,
    },
    "bsc-testnet": {
      url: process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 97,
      gasPrice: 10000000000,
      timeout: 600000,
    },
    "bsc-mainnet": {
      url: process.env.BSC_MAINNET_RPC || "https://bsc-dataseed1.binance.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 56,
      gasPrice: 5000000000,
      timeout: 600000,
    },
    sepolia: {
      url: process.env.ETHEREUM_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111,
      timeout: 600000,
    },
    mainnet: {
      url: process.env.ETHEREUM_MAINNET_RPC || "https://eth-mainnet.g.alchemy.com/v2/6tgWso4UXVZmfMyP0ErKJ",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 1,
      timeout: 600000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  paths: {
    sources: "./src",
    tests: "./test",
    artifacts: "./artifacts",
    cache: "./cache",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
