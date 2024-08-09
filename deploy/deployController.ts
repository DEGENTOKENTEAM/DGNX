import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async ({ getNamedAccounts, deployments, ecosystem }: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  log(`🚀 Start deploying ControllerV3`);
  const config = await ecosystem.getConfig();
  const { contracts } = await ecosystem.getProtocols();
  await deploy('DGNXControllerV3', {
    log: true,
    from: deployer,
    args: [contracts.token, contracts.locker, contracts.wrapper, contracts.disburser, contracts.distributor],
    proxy: {
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [config.buyFees, config.sellFees, [contracts.tjoeLPWAVAX, contracts.pangoLPWAVAX], [], deployer],
        },
      },
    },
  });
  log(`✅ Finish deploying ControllerV3`);
};

func.id = 'deployController';
func.dependencies = ['FundAccounts', 'ImpersonateAccounts', 'DeployMocks'];
func.tags = ['DeployController'];

export default func;
