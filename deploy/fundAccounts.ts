import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { expandDecimals } from './../utils/math';

const func: DeployFunction = async ({ getNamedAccounts, deployments, network }: HardhatRuntimeEnvironment) => {
  const { log } = deployments;
  log(`🚀 Start funding accounts`);
  const { deployer } = await getNamedAccounts();
  const balance = expandDecimals(10000, 18);
  await setBalance(deployer, balance);
  log('Set deployer %s balance to %s', deployer, balance);
  log(`✅ Finish funding accounts`);
};

func.skip = async ({ network }: HardhatRuntimeEnvironment) => network.live;
func.tags = ['FundAccounts'];

export default func;
