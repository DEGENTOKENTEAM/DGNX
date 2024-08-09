import { Config } from './config';
import { ProtocolConfig } from './protocols';
declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    ecosystem: {
      getConfig: () => Promise<Config>;
      getProtocols: () => Promise<ProtocolConfig>;
    };
  }
}
