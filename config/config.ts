import { HardhatRuntimeEnvironment } from 'hardhat/types';

export type Config = {
  buyFees: string[];
  sellFees: string[];
};

export default async function ({ ecosystem }: HardhatRuntimeEnvironment): Promise<Config> {
  const config: Config = {
    buyFees: [
      '0x9613ee95a7f8b57c4773108cd46d076271db89b25fede6e7ba97f60f2ac3b141', // marketing v2
      '0x6d01d9ea6e6a0240c52d1a22f607ce92e83626395b8dbbdb9a1a57f9da9f834e', // rewards (staking & lb)  v2
      '0x38320ddaa2b9200b700fe8f79bd1836f49203e2d91eb82209ee6074eacfb30c6', // platform  v2
      '0xdec995fc864fc294e4f214d2bd6cd54c4cf505e5d8a060b785ea57726145d495', // dev  v2
    ],
    sellFees: [
      '0x9613ee95a7f8b57c4773108cd46d076271db89b25fede6e7ba97f60f2ac3b141', // marketing  v2
      '0x6d01d9ea6e6a0240c52d1a22f607ce92e83626395b8dbbdb9a1a57f9da9f834e', // rewards (staking & lb)  v2
      '0x38320ddaa2b9200b700fe8f79bd1836f49203e2d91eb82209ee6074eacfb30c6', // platform  v2
      '0xdec995fc864fc294e4f214d2bd6cd54c4cf505e5d8a060b785ea57726145d495', // dev  v2
    ],
  };
  return config;
}
