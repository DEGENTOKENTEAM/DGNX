import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { verifyContract } from '../scripts/verifier';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { getNamedAccounts, deployments, ecosystem } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  log(`🚀 Start deploying ControllerV3`);
  const config = await ecosystem.getConfig();
  const { contracts } = await ecosystem.getProtocols();
  const { address } = await deploy('DGNXControllerV3', {
    log: true,
    from: deployer,
    args: [
      contracts.timelockController,
      contracts.token,
      contracts.locker,
      contracts.wrapper,
      contracts.disburser,
      contracts.distributor,
    ],
    proxy: {
      owner: deployer,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [config.buyFees, config.sellFees, [contracts.tjoeLPWAVAX, contracts.pangoLPWAVAX], [], deployer],
        },
      },
    },
  });

  await verifyContract(hre, 'DGNXControllerV3', {
    address,
    args: [
      contracts.timelockController,
      contracts.token,
      contracts.locker,
      contracts.wrapper,
      contracts.disburser,
      contracts.distributor,
    ],
  });

  log(`✅ Finish deploying ControllerV3`);
};

func.id = 'deployController';
func.dependencies = ['FundAccounts', 'ImpersonateAccounts', 'DeployMocks'];
func.tags = ['DeployController'];

export default func;
