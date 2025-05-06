import { HardhatRuntimeEnvironment } from 'hardhat/types';

type Config = {
  contracts: {
    token: string;
    locker: string;
    wrapper: string;
    governor: string;
    platform: string;
    disburser: string;
    marketing: string;
    distributor: string;
    tjoeLPWAVAX: string;
    pangoLPWAVAX: string;
    previousController: string;
    timelockController: string;
  };
  accounts: { development: string };
};
export type ProtocolConfig = Config;

export default async function ({ ecosystem }: HardhatRuntimeEnvironment): Promise<Config> {
  const config: Config = {
    contracts: {
      token: '0x51e48670098173025C477D9AA3f0efF7BF9f7812',
      locker: '0x2c7D8bB6aBA4FFf56cDDBF9ea47ed270A10098F7',
      wrapper: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      governor: '0xbdA8dcEB22b0e06Ad612f339C41539Ea2ddCCEf8',
      platform: '0xcA01A9d36F47561F03226B6b697B14B9274b1B10',
      disburser: '0x8a0E3264Da08bf999AfF5a50AabF5d2dc89fab79',
      marketing: '0x16eF18E42A7d72E52E9B213D7eABA269B90A4643',
      distributor: '0x0000000000300dd8B0230efcfEf136eCdF6ABCDE',
      tjoeLPWAVAX: '0xbcaBb94006400eD84c3699728d6ecbAa06665c89',
      pangoLPWAVAX: '0x4a8323A220D554C03733612D415d465B3f21F12e',
      previousController: '0x223B26cC3d0154Ee9B625e94Eb194940a8Ca3867',
      timelockController: '0xC07017739f09778ccea0468dA7b8381f1967Eb95',
    },
    accounts: {
      development: '0xdF090f6675034Fde637031c6590FD1bBeBc4fa45',
    },
  };
  return config;
}
