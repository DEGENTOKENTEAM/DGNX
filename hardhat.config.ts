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
    // ropsten: {
    //   url: process.env.ROPSTEN_URL || "",
    //   allowUnlimitedContractSize: true,
    //   accounts:
    //     process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // },
    // testnet: {
    //   url: "https://data-seed-prebsc-1-s1.binance.org:8545",
    //   chainId: 97,
    //   gasPrice: 20000000000,
    //   accounts: [`0x${process.env.PRIVATE_KEY}`],
    // },
    fuji: {
      chainId: 43113,
      gasPrice: 225000000000,
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [`0x${process.env.PRIAVTE_KEY_AVAX_FUJI}`],
    },
    // mastertoco: {
    //   chainId: 43113,
    //   gasPrice: 225000000000,
    //   url: "https://avaxtestnet.mastertoco.de",
    //   accounts: [`0x${process.env.PRIAVTE_KEY_AVAX_FUJI}`],
    // },
    // avaxmainnettest: {
    //   chainId: 43114,
    //   gasPrice: 225000000000,
    //   url: "https://api.avax.network/ext/bc/C/rpc",
    //   accounts: [`0x${process.env.PRIAVTE_KEY_AVAX_MAINNET_TEST}`],
    // },
    localfork: {
      url: "http://127.0.0.1:8545",
      gasPrice: 225000000000,
      accounts: [`0x${process.env.PRIAVTE_KEY_AVAX_FUJI}`],
    },
    // mainnet: {
    //   url: "https://bsc-dataseed.binance.org/",
    //   chainId: 56,
    //   gasPrice: 225000000000,
    //   accounts: {mnemonic: process.env.PRIVATE_KEY}
    // }
    // hardhat: {
    //   forking: {
    //     enabled: true,
    //     url: process.env.NODE_URL || "",
    //   },
    // },
    hardhat: {
      chainId: parseInt(process.env.CHAIN_ID || ""),
      gasPrice: 225000000000,
      accounts: {
        count: 100,
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
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY,
    },
  },
  paths: {
    sources: "./contracts/dgnx",
  },
};

export default config;
