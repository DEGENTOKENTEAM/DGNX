import { impersonateAccount } from '@nomicfoundation/hardhat-network-helpers';
import { deployments } from 'hardhat';
import { DGNXControllerMock, DGNXControllerV3 } from '../typechain-types';

export const deployFixtures = deployments.createFixture(
  async ({ deployments, ethers, ecosystem }, options?: { fixtures: string[] }) => {
    await deployments.fixture(options?.fixtures);
    const accountList = await ethers.getSigners();
    const [deployer, signer0, signer1, signer2] = accountList;

    const config = await ecosystem.getConfig();
    const protocols = await ecosystem.getProtocols();

    const token$ = await ethers.getContractAt('DEGENXMock', protocols.contracts.token);
    const wrapper$ = await ethers.getContractAt('ERC20Mock', protocols.contracts.wrapper);
    const disburser$ = await ethers.getContractAt('LegacyDisburserMock', protocols.contracts.disburser);
    const timelock$ = await ethers.getContractAt('DGNXTimelockController', protocols.contracts.timelockController);
    const controller$ = (await ethers.getContract('DGNXControllerV3')) as DGNXControllerV3;
    const distributor$ = await ethers.getContractAt('DistributorMock', protocols.contracts.distributor);
    const previousController$ = (await ethers.getContract('DGNXControllerMock')) as DGNXControllerMock;

    const { tjoeLPWAVAX, pangoLPWAVAX, previousController, wrapper, locker, platform, marketing } = protocols.contracts;
    const { development } = protocols.accounts;

    await impersonateAccount(development);
    const developmentSigner = await ethers.getSigner(development);

    const { buyFees, sellFees } = config;

    return {
      accounts: {
        deployer,
        signer0,
        signer1,
        signer2,
        developmentSigner,
      },
      contracts: {
        token$,
        wrapper$,
        timelock$,
        disburser$,
        controller$,
        distributor$,
        previousController$,
      },
      contractAddresses: {
        wrapper,
        tjoeLPWAVAX,
        pangoLPWAVAX,
        previousController,
        locker,
        platform,
        marketing,
      },
      buyFees,
      sellFees,
      accountList,
      getContract: async (contractName: string) => {
        return await ethers.getContract(contractName);
      },
    };
  }
);

// export async function deployFixtures(fixtures?: string | string[]) {

// }
