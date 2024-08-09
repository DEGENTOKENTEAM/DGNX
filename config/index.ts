import { extendEnvironment } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import config from './config';
import protocolConfig from './protocols';

extendEnvironment(async (hre: HardhatRuntimeEnvironment) => {
  hre.ecosystem = {
    getConfig: async () => config(hre),
    getProtocols: _.memoize(async () => protocolConfig(hre)),
  };
});
