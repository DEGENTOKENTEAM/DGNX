import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    testnet: {
      chainId: 43113,
      gasPrice: 225000000000,
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [`0x${process.env.PRIVATE_KEY_DEPLOYER_TESTNET}`],
    },
    mainnet: {
      chainId: 43114,
      gasPrice: 225000000000,
      url: "https://api.avax.network/ext/bc/C/rpc",
      // accounts: [`0x${process.env.PRIVATE_KEY_DEPLOYER_MAINNET}`],
      accounts: {
        mnemonic: `${process.env.PRIVATE_KEY_DEPLOYER_MAINNET_MNEMONIC}`,
      },
    },
    localfork: {
      url: "http://127.0.0.1:8545",
      chainId: parseInt(process.env.CHAIN_ID || ""),
      gasPrice: 225000000000,
      // accounts: [`0x${process.env.PRIVATE_KEY_DEPLOYER_TESTNET}`],
      accounts: {
        mnemonic: `${process.env.PRIVATE_KEY_DEPLOYER_MAINNET_MNEMONIC}`,
      },
    },
    hardhat: {
      chainId: parseInt(process.env.CHAIN_ID || ""),
      gasPrice: 225000000000,
      accounts: {
        count: 20,
      },
      forking: {
        enabled: true,
        url: process.env.NODE_URL || "",
        blockNumber: parseInt(process.env.NODE_BLOCK || ""),
      },
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.ETHERSCAN_API_KEY,
      avalanche: process.env.SNOWTRACE_API_KEY_MAINNET,
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY,
    },
  },
  paths: {
    sources: "./contracts/dgnx",
  },
};

export default config;
