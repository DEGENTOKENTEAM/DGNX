import { impersonateAccount, setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { expandDecimals } from './../utils/math';

const func: DeployFunction = async ({ deployments: { log }, ecosystem }: HardhatRuntimeEnvironment) => {
  log(`🚀 Start impersonating accounts`);
  const {
    contracts: { timelockController },
  } = await ecosystem.getProtocols();
  await impersonateAccount(timelockController);
  await setBalance(timelockController, expandDecimals(10000, 18));
  log(`✅ Finish impersonating accounts`);
};

func.skip = async ({ network }: HardhatRuntimeEnvironment) => network.live;
func.tags = ['ImpersonateAccounts'];

export default func;
