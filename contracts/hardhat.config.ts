import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "@typechain/hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  defaultNetwork: "amoy",
  networks: {
    amoy: {
      url: process.env.AMOY_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY || ""]
    }
  },
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
  solidity: "0.8.24",
  typechain: {
    outDir: "../packages/shared/types",
    target: "ethers-v5"
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
