import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import * as dotenv from 'dotenv';
import { expand as dotenvExpand } from 'dotenv-expand';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import { HardhatUserConfig } from 'hardhat/config';
import 'solidity-docgen';
import './config';
import { NETWORK_HARDHAT, NETWORK_MAINNET_AVAX } from './utils/networks';
require('@openzeppelin/hardhat-upgrades');
require('hardhat-contract-sizer');
require('solidity-coverage');

dotenvExpand(dotenv.config());

const accounts =
  process.env.USE_REAL_ACCOUNTS === 'true'
    ? {
        mnemonic: `${process.env.PRIVATE_KEY_DEPLOYER_MAINNET_MNEMONIC}`,
      }
    : undefined;

const accountsHardhat =
  process.env.USE_REAL_ACCOUNTS === 'true'
    ? [{ privateKey: `${process.env.PRIVATE_KEY_DEPLOYER_MAINNET}`, balance: (1337n * 10n ** 18n).toString() }]
    : undefined;

const localforkAVAX = {
  chainId: parseInt(`${process.env.LOCALFORK_CHAIN_ID_AVAX}`),
  block: parseInt(`${process.env.LOCALFORK_BLOCK_AVAX}`),
  url: `${process.env.LOCALFORK_RPC_AVAX}`,
};

const localforkRPCs: { [network: string]: { block: number; url: string; chainId: number } } = {
  [NETWORK_MAINNET_AVAX]: { ...localforkAVAX },
};

localforkRPCs[NETWORK_HARDHAT] = localforkRPCs[`${process.env.LOCALFORK_RPC_NETWORK}`];

const useLocalforkInstead = process.env.USE_LOCALFORK_INSTEAD !== 'false';
const localforkUrl = 'http://127.0.0.1:8545';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.13',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.26',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.6.2',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.5.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.9',
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
    'testnet-avax': {
      live: !useLocalforkInstead,
      chainId: 43113,
      url: useLocalforkInstead ? localforkUrl : 'https://api.avax-test.network/ext/bc/C/rpc',
      accounts,
    },
    'mainnet-avax': {
      live: !useLocalforkInstead,
      chainId: 43114,
      url: useLocalforkInstead ? localforkUrl : 'https://api.avax.network/ext/bc/C/rpc',
      accounts,
    },
    localfork: {
      live: false,
      url: localforkUrl,
      accounts,
    },
    hardhat: {
      live: false,
      saveDeployments: false,
      chainId: localforkRPCs[`${process.env.LOCALFORK_RPC_NETWORK}`].chainId,
      accounts: accountsHardhat,
      forking: {
        enabled: true,
        url: localforkRPCs[`${process.env.LOCALFORK_RPC_NETWORK}`].url,
        blockNumber: localforkRPCs[`${process.env.LOCALFORK_RPC_NETWORK}`].block,
      },
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  typechain: {
    alwaysGenerateOverloads: true
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  docgen: {
    pages: 'files',
    exclude: ['__mocks__'],
  },
  etherscan: {
    apiKey: {
      avalanche: process.env.SNOWTRACE_API_KEY_MAINNET || '',
    },
  },
  paths: {
    sources: './contracts',
  },
};

export default config;
