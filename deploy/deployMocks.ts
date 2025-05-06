import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async ({ getNamedAccounts, deployments, ecosystem }: HardhatRuntimeEnvironment) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const { contracts } = await ecosystem.getProtocols();
  log(`🚀 Start deploying mocks`);

  {
    const { address } = await deploy('DEGENX', {
      from: deployer,
    });
    contracts.token = address;
  }

  {
    const { address } = await deploy('DEGENXMock', {
      from: deployer,
    });
    contracts.token = address;
  }

  {
    const { address } = await deploy('ERC20Mock', {
      from: deployer,
    });
    contracts.wrapper = address;
  }

  {
    const { address } = await deploy('LegacyDisburserMock', {
      from: deployer,
    });
    contracts.disburser = address;
  }

  {
    const { address } = await deploy('DistributorMock', {
      from: deployer,
    });
    contracts.distributor = address;
  }

  {
    const { address } = await deploy('DGNXControllerMock', {
      from: deployer,
    });
    contracts.previousController = address;
  }

  log(`✅ Finish deploying mocks`);
};

func.skip = async ({ network }: HardhatRuntimeEnvironment) => network.live;
func.tags = ['DeployMocks'];

export default func;
