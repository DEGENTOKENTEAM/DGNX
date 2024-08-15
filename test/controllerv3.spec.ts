import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { impersonateAccount, setBalance, stopImpersonatingAccount } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { keccak256, parseEther, toUtf8Bytes, ZeroAddress } from 'ethers';
import { ethers, network } from 'hardhat';
import { DGNXTimelockController } from '../typechain';
import {
  DEGENXMock,
  DGNXControllerMock,
  DGNXControllerV3,
  DistributorMock,
  ERC20Mock,
  LegacyDisburserMock,
} from '../typechain-types';
import { deployFixtures } from '../utils/fixtures';

describe('DGNX Controller V3', function () {
  let controller$: DGNXControllerV3;
  let disburser$: LegacyDisburserMock;
  let distributor$: DistributorMock;
  let previousController$: DGNXControllerMock;
  let token$: DEGENXMock;
  let wrapper$: ERC20Mock;
  let deployer: SignerWithAddress,
    signer0: SignerWithAddress,
    signer1: SignerWithAddress,
    signer2: SignerWithAddress,
    developmentSigner: SignerWithAddress;
  let buyFees: string[], sellFees: string[];
  let pangoLPWAVAX: string,
    tjoeLPWAVAX: string,
    previousController: string,
    locker: string,
    marketing: string,
    platform: string;
  let feeA: string, feeB: string, feeC: string, feeD: string;

  let snapshotId: any;

  beforeEach(async function () {
    const fixtures = await deployFixtures({
      fixtures: ['FundAccounts', 'ImpersonateAccounts', 'DeployMocks', 'DeployController'],
    });

    ({ buyFees, sellFees } = fixtures);
    ({ token$, controller$, previousController$, wrapper$, distributor$, disburser$ } = fixtures.contracts);
    ({ pangoLPWAVAX, tjoeLPWAVAX, previousController, locker, marketing, platform } = fixtures.contractAddresses);
    ({ deployer, signer0, signer1, signer2, developmentSigner } = fixtures.accounts);
    [feeA, feeB, feeC, feeD] = fixtures.buyFees;

    snapshotId = await network.provider.send('evm_snapshot');
  });

  afterEach(async function () {
    await network.provider.send('evm_revert', [snapshotId]);
  });

  describe('Deployment', function () {
    it('should deploy successfully && initialized', async function () {
      expect(await controller$.getDeployedCode()).to.not.be.empty;
      expect(await controller$.isInitialized()).to.be.true;
      expect(await controller$.getBuyFees()).to.have.length(4);
      expect(await controller$.getSellFees()).to.have.length(4);
      expect(await controller$.getAllUsedFees()).to.have.length(4);
      expect(await controller$.getInitializedVersion()).to.eq(1);
      expect(await controller$.isLP(pangoLPWAVAX)).to.be.true;
      expect(await controller$.isLP(tjoeLPWAVAX)).to.be.true;

      await expect(controller$.connect(signer0).initialize([], [], [], [], ZeroAddress)).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });
  });

  describe('Fee Management', function () {
    it('should be able to remove all fees in one batch', async function () {
      await expect(controller$.connect(signer0).updateFeeIds([], [])).to.be.revertedWith(
        `AccessControl: account ${signer0.address.toLowerCase()} is missing role 0xf206625bad3d9112d5609b8d356e6fbd514cd1f69980d4ce2b3e6e68e1789ace`
      );
      await expect(controller$.updateFeeIds([], [])).to.emit(controller$, 'UpdatedFeeIds');
      expect(await controller$.getBuyFees()).to.have.length(0);
      expect(await controller$.getSellFees()).to.have.length(0);
      expect(await controller$.getAllUsedFees()).to.have.length(0);
    });

    it('should be able to set all fees in one batch', async function () {
      const randomFeeId = keccak256(toUtf8Bytes('randomFeeId'));
      const randomFeeIdOther = keccak256(toUtf8Bytes('randomFeeIdOther'));

      await expect(controller$.updateFeeIds([randomFeeId], [])).to.emit(controller$, 'UpdatedFeeIds');
      expect(await controller$.getBuyFees()).to.have.length(1);
      expect(await controller$.getSellFees()).to.have.length(0);
      expect(await controller$.getAllUsedFees()).to.have.length(1);

      await expect(controller$.updateFeeIds([randomFeeId], [randomFeeId])).to.emit(controller$, 'UpdatedFeeIds');
      expect(await controller$.getBuyFees()).to.have.length(1);
      expect(await controller$.getSellFees()).to.have.length(1);
      expect(await controller$.getAllUsedFees()).to.have.length(1);

      await expect(controller$.updateFeeIds([randomFeeId], [randomFeeIdOther])).to.emit(controller$, 'UpdatedFeeIds');
      expect(await controller$.getBuyFees()).to.have.length(1);
      expect(await controller$.getSellFees()).to.have.length(1);
      expect(await controller$.getAllUsedFees()).to.have.length(2);

      await expect(controller$.updateFeeIds([randomFeeId, randomFeeIdOther], [randomFeeIdOther])).to.emit(
        controller$,
        'UpdatedFeeIds'
      );
      expect(await controller$.getBuyFees()).to.have.length(2);
      expect(await controller$.getSellFees()).to.have.length(1);
      expect(await controller$.getAllUsedFees()).to.have.length(2);
    });
  });

  describe('LP Management', function () {
    it('should be able to add an LP address', async function () {
      const randomAddy = ethers.Wallet.createRandom().address;
      await expect(controller$.enableLP(randomAddy, true)).to.emit(controller$, 'AddLP');
      expect(await controller$.isLP(randomAddy)).to.be.true;
    });

    it('should be able to remove an LP address', async function () {
      const randomAddy = ethers.Wallet.createRandom().address;
      await controller$.enableLP(randomAddy, true);
      await expect(controller$.enableLP(randomAddy, false)).to.emit(controller$, 'RemoveLP');
      expect(await controller$.isLP(randomAddy)).to.be.false;
    });
  });

  describe('Exclude Account Management', function () {
    it('should be able to exclude an account address', async function () {
      expect(await controller$.isExcluded(signer0.address)).to.be.false;
      await expect(controller$.excludeAccount(signer0.address, true)).to.emit(controller$, 'ExcludeAccount');
      expect(await controller$.isExcluded(signer0.address)).to.be.true;
    });

    it('should be able to include an excluded account address', async function () {
      await controller$.excludeAccount(signer0.address, true);
      await expect(controller$.excludeAccount(signer0.address, false)).to.emit(controller$, 'IncludeAccount');
      expect(await controller$.isExcluded(signer0.address)).to.be.false;
    });
  });

  describe('Migration (Unit)', function () {
    let account: SignerWithAddress;

    beforeEach(async function () {
      const tokenAddress = await token$.getAddress();
      await impersonateAccount(tokenAddress);
      setBalance(tokenAddress, parseEther('1'));
      account = await ethers.getSigner(tokenAddress);
    });

    afterEach(async function () {
      await stopImpersonatingAccount(await token$.getAddress());
    });

    it('should be able to initiate migration process and transfer tokens properly', async function () {
      await token$.mint(await controller$.getAddress(), parseEther('1'));
      await wrapper$.mint(await controller$.getAddress(), parseEther('1'));

      await expect(controller$.migration(previousController)).to.revertedWithCustomError(controller$, 'NotAllowed');
      await expect(controller$.connect(account).migration(ZeroAddress)).to.revertedWithCustomError(
        controller$,
        'NotAllowed'
      );
      await expect(controller$.connect(account).migration(await controller$.getAddress())).to.revertedWithCustomError(
        controller$,
        'NotAllowed'
      );

      const exec = controller$.connect(account).migration(previousController);
      await expect(exec).to.emit(controller$, 'MigratingController');
      await expect(exec).to.emit(previousController$, 'MigrateEvent');
      await expect(exec).to.changeTokenBalances(
        token$,
        [await controller$.getAddress(), deployer],
        [parseEther('-1'), parseEther('1')]
      );
      await expect(exec).to.changeTokenBalances(
        wrapper$,
        [await controller$.getAddress(), deployer],
        [parseEther('-1'), parseEther('1')]
      );

      expect(await controller$.previousController()).to.eq(previousController);
    });
  });

  describe('Transfer Fee', function () {
    beforeEach(async function () {
      await distributor$.setReturn_feeGenericGetFee(feeA, 100);
      await distributor$.setReturn_feeGenericGetFee(feeB, 100);
      await distributor$.setReturn_feeGenericGetFee(feeC, 100);
      await distributor$.setReturn_feeGenericGetFee(feeD, 100);
    });

    describe('Estimation', function () {
      it('should estimate fees', async function () {
        const amount = parseEther('1');
        const fees = [0n, 0n, 0n, 0n, 0n, 0n, 0n];
        const noFees = [parseEther('1'), 0n, 0n, 0n, 0n, 0n, 0n];

        expect(await controller$.estimateTransferFees(tjoeLPWAVAX, signer0.address, amount), 'from LP').to.deep.eq(
          fees
        );
        expect(await controller$.estimateTransferFees(signer0.address, tjoeLPWAVAX, amount), 'to LP').to.deep.eq(fees);

        // excluded signer
        await controller$.excludeAccount(signer0.address, true);

        expect(
          await controller$.estimateTransferFees(tjoeLPWAVAX, signer0.address, amount),
          'from LP with excluded signer0'
        ).to.deep.eq(noFees);

        expect(
          await controller$.estimateTransferFees(signer0.address, tjoeLPWAVAX, amount),
          'to LP with excluded signer0'
        ).to.deep.eq(noFees);

        expect(
          await controller$.estimateTransferFees(signer0.address, tjoeLPWAVAX, amount),
          'to LP with excluded signer0'
        ).to.deep.eq(noFees);

        expect(
          await controller$.estimateTransferFees(signer0.address, signer1.address, amount),
          'no signer is participating in the disburser'
        ).to.deep.eq(noFees);

        await disburser$.setReturn_legacyAmounts(signer1.address, 1);
        expect(
          await controller$.estimateTransferFees(signer0.address, signer1.address, amount),
          'signer1 is participating in the disburser and one party is excluded'
        ).to.deep.eq(noFees);

        await controller$.excludeAccount(signer0.address, false);
        expect(
          await controller$.estimateTransferFees(signer0.address, signer1.address, amount),
          'signer1 is participating in the disburser and neither is excluded'
        ).to.deep.eq(fees);

        expect(
          await controller$.estimateTransferFees(signer1.address, signer0.address, amount),
          'signer1 can still transfer without fees'
        ).to.deep.eq(noFees);

        // reset fees
        await controller$.updateFeeIds([], []);

        expect(
          await controller$.estimateTransferFees(tjoeLPWAVAX, signer0.address, amount),
          'signer0 receives no charges from LP when no fees are configured'
        ).to.deep.eq(noFees);

        expect(
          await controller$.estimateTransferFees(tjoeLPWAVAX, signer1.address, amount),
          'signer1 receives no charges from LP when no fees are configured'
        ).to.deep.eq(noFees);
      });
    });

    describe('Charge', function () {
      let account: SignerWithAddress;
      let contractAddress: string;

      beforeEach(async function () {
        await token$.mint(await controller$.getAddress(), parseEther('10'));
        await impersonateAccount(await token$.getAddress());
        await setBalance(await token$.getAddress(), parseEther('1'));
        account = await ethers.getSigner(await token$.getAddress());
      });

      afterEach(async function () {
        await stopImpersonatingAccount(await token$.getAddress());
      });

      it('should charge fees on buy and sell when fees are set (default)', async function () {
        await expect(
          controller$.transferFees(signer0.address, tjoeLPWAVAX, parseEther('1'))
        ).to.be.revertedWithCustomError(controller$, 'NotAllowed');

        await expect(
          controller$.connect(account).transferFees(signer0.address, tjoeLPWAVAX, 0)
        ).to.be.revertedWithCustomError(controller$, 'ZeroValueNotAllowed');

        // BUY
        const execBuy = controller$.connect(account).transferFees(tjoeLPWAVAX, signer0.address, parseEther('1'));
        await expect(execBuy).to.changeTokenBalances(
          token$,
          [await controller$.getAddress(), await distributor$.getAddress()],
          [parseEther('0'), parseEther('0')]
        );

        expect(await controller$.getTotalFees()).to.eq(parseEther('0.04'));
        await controller$.connect(account).transferFees(tjoeLPWAVAX, signer0.address, parseEther('1'));
        expect(await controller$.getTotalFees()).to.eq(parseEther('0.08'));

        // SELL
        const execSell = controller$.connect(account).transferFees(signer0.address, tjoeLPWAVAX, parseEther('1'));
        await expect(execSell)
          .to.emit(distributor$, 'Event_pushFees')
          .withArgs(await token$.getAddress(), parseEther('0.12'), anyValue);
        await expect(execSell).to.changeTokenBalances(
          token$,
          [await controller$.getAddress(), await distributor$.getAddress()],
          [parseEther('-0.12'), parseEther('0.12')]
        );
        expect(await controller$.getTotalFees()).to.eq(parseEther('0'));
      });

      it('should charge fees on buy and sell when no fees are set', async function () {
        await controller$.updateFeeIds([], []);
        await controller$.connect(account).transferFees(tjoeLPWAVAX, signer0.address, parseEther('1'));
        expect(await controller$.getTotalFees()).to.eq(parseEther('0'));
        await controller$.connect(account).transferFees(signer0.address, tjoeLPWAVAX, parseEther('1'));
        expect(await controller$.getTotalFees()).to.eq(parseEther('0'));
      });

      it('should charge disburser fees on transfer', async function () {
        await disburser$.setReturn_legacyAmounts(signer1.address, 1);

        expect(
          await controller$
            .connect(account)
            .transferFees.staticCallResult(signer0.address, signer1.address, parseEther('1'))
        ).to.deep.eq([parseEther('0.95')]);
        expect(
          await controller$
            .connect(account)
            .transferFees.staticCallResult(signer1.address, signer0.address, parseEther('1'))
        ).to.deep.eq([parseEther('1')]);

        await expect(
          controller$.connect(account).transferFees(signer0.address, signer1.address, parseEther('1')),
          'signer0 > signer1, signer1 in disburser'
        ).to.changeTokenBalance(token$, locker, parseEther('0.05'));
        await expect(
          controller$.connect(account).transferFees(signer1.address, signer0.address, parseEther('1')),
          'signer1 > signer0, signer1 in disburser'
        ).to.changeTokenBalance(token$, locker, parseEther('0'));

        await controller$.updateFeeIds([], []);

        await expect(
          controller$.connect(account).transferFees(tjoeLPWAVAX, signer1.address, parseEther('1')),
          'buy without fees but in disburser'
        ).to.changeTokenBalance(token$, locker, parseEther('0'));

        await expect(
          controller$.connect(account).transferFees(signer1.address, tjoeLPWAVAX, parseEther('1')),
          'sell without fees but in disburser'
        ).to.changeTokenBalance(token$, locker, parseEther('0'));
      });

      it('should avoid to charge fees when sender is excluded', async function () {
        await disburser$.setReturn_legacyAmounts(signer1.address, 1);
        await controller$.excludeAccount(signer1.address, true);

        await controller$.connect(account).transferFees(tjoeLPWAVAX, signer1.address, parseEther('1'));
        expect(await controller$.getTotalFees()).to.eq(0);

        await controller$.connect(account).transferFees(signer1.address, tjoeLPWAVAX, parseEther('1'));
        expect(await controller$.getTotalFees()).to.eq(0);

        await controller$.updateFeeIds([], []);

        await expect(
          controller$.connect(account).transferFees(tjoeLPWAVAX, signer1.address, parseEther('1')),
          'buy being in disburser and fees not available, but excluded'
        ).to.changeTokenBalance(token$, locker, parseEther('0'));

        await expect(
          controller$.connect(account).transferFees(signer1.address, tjoeLPWAVAX, parseEther('1')),
          'sell being in disburser and fees not available, but excluded'
        ).to.changeTokenBalance(token$, locker, parseEther('0'));

        await expect(
          controller$.connect(account).transferFees(signer0.address, signer1.address, parseEther('1')),
          'transfer from signer0 to signer1 with signer1 being in disburser, but excluded'
        ).to.changeTokenBalance(token$, locker, parseEther('0'));

        await expect(
          controller$.connect(account).transferFees(signer1.address, signer0.address, parseEther('1')),
          'transfer from signer1 to signer0 with signer1 being in disburser, but excluded'
        ).to.changeTokenBalance(token$, locker, parseEther('0'));
      });

      it('should charge fees even if only just one out of two fees is set', async function () {
        await token$.updateController(await controller$.getAddress());
        await distributor$.setReturn_feeGenericGetFee(feeB, 0);
        await controller$.updateFeeIds([feeA], [feeB, feeC]);
        await token$.mint(signer0.address, parseEther('1'));
        await expect(token$.connect(signer0).transfer(tjoeLPWAVAX, parseEther('1'))).to.changeTokenBalance(
          token$,
          await distributor$.getAddress(),
          parseEther('0.01')
        );
      });

      it('should not charge fees because fee values are 0 but fee ids are set', async function () {
        await token$.updateController(await controller$.getAddress());
        await distributor$.setReturn_feeGenericGetFee(feeB, 0);
        await distributor$.setReturn_feeGenericGetFee(feeC, 0);
        await controller$.updateFeeIds([feeA], [feeB, feeC]);
        await token$.mint(signer0.address, parseEther('1'));
        await expect(token$.connect(signer0).transfer(tjoeLPWAVAX, parseEther('1'))).to.changeTokenBalance(
          token$,
          await distributor$.getAddress(),
          parseEther('0')
        );
      });
    });
  });

  describe('Migration (Integration)', function () {
    it('should be initiated by the token successfully', async function () {
      const controllerAddress = await controller$.getAddress();
      await token$.updateController(previousController);

      await token$.mint(controllerAddress, parseEther('1'));
      await wrapper$.mint(controllerAddress, parseEther('1'));

      const exec = token$.updateController(controllerAddress);
      await expect(exec).to.emit(controller$, 'MigratingController');

      await expect(exec).to.changeTokenBalances(
        wrapper$,
        [controllerAddress, deployer.address],
        [parseEther('-1'), parseEther('1')]
      );

      await expect(exec).to.changeTokenBalances(
        token$,
        [controllerAddress, deployer.address],
        [parseEther('-1'), parseEther('1')]
      );
    });
  });

  describe('Transfer Fee (Integration)', function () {
    it('should be able to transfer with fees', async function () {
      const controllerAddress = await controller$.getAddress();
      await distributor$.setReturn_feeGenericGetFee(feeA, 100);
      await distributor$.setReturn_feeGenericGetFee(feeB, 100);
      await distributor$.setReturn_feeGenericGetFee(feeC, 100);
      await distributor$.setReturn_feeGenericGetFee(feeD, 100);
      await token$.updateController(previousController);
      await token$.updateController(controllerAddress);
      await token$.mint(signer0, parseEther('100'));
      await token$.mint(signer1, parseEther('100'));
      await token$.mint(tjoeLPWAVAX, parseEther('100'));
      await impersonateAccount(tjoeLPWAVAX);
      await setBalance(tjoeLPWAVAX, parseEther('1'));
      const signerLP = await ethers.getSigner(tjoeLPWAVAX);

      await expect(
        token$.connect(signerLP).transfer(signer0.address, parseEther('1')),
        'buy transfer'
      ).to.changeTokenBalances(
        token$,
        [tjoeLPWAVAX, controllerAddress, await distributor$.getAddress(), signer0.address],
        [parseEther('-1'), parseEther('0.04'), parseEther('0'), parseEther('0.96')]
      );

      await expect(
        token$.connect(signer0).transfer(tjoeLPWAVAX, parseEther('1')),
        'sell transfer'
      ).to.changeTokenBalances(
        token$,
        [tjoeLPWAVAX, controllerAddress, await distributor$.getAddress()],
        [parseEther('0.96'), parseEther('-0.04'), parseEther('0.08')]
      );

      await expect(
        token$.connect(signer0).transfer(signer1.address, parseEther('1')),
        'p2p transfer signer0 > signer1'
      ).to.changeTokenBalances(token$, [signer0.address, signer1.address], [parseEther('-1'), parseEther('1')]);

      await expect(
        token$.connect(signer1).transfer(signer0.address, parseEther('1')),
        'p2p transfer signer1 > signer0'
      ).to.changeTokenBalances(token$, [signer1.address, signer0.address], [parseEther('-1'), parseEther('1')]);

      // signer1 to disburser
      await disburser$.setReturn_legacyAmounts(signer1.address, 1);

      await expect(
        token$.connect(signerLP).transfer(signer0.address, parseEther('1')),
        'buy transfer from signer1 with signer1 in disburser'
      ).to.changeTokenBalances(
        token$,
        [tjoeLPWAVAX, controllerAddress, await distributor$.getAddress(), signer0.address],
        [parseEther('-1'), parseEther('0.04'), parseEther('0'), parseEther('0.96')]
      );

      await expect(
        token$.connect(signer0).transfer(tjoeLPWAVAX, parseEther('1')),
        'sell transfer from signer1 with signer1 in disburser'
      ).to.changeTokenBalances(
        token$,
        [tjoeLPWAVAX, controllerAddress, await distributor$.getAddress()],
        [parseEther('0.96'), parseEther('-0.04'), parseEther('0.08')]
      );

      await expect(
        token$.connect(signer0).transfer(signer1.address, parseEther('1')),
        'p2p transfer signer0 > signer1 with signer1 in disburser'
      ).to.changeTokenBalances(
        token$,
        [signer0.address, signer1.address, locker],
        [parseEther('-1'), parseEther('0.95'), parseEther('0.05')]
      );

      await expect(
        token$.connect(signer1).transfer(signer0.address, parseEther('1')),
        'p2p transfer signer1 > signer0 with signer1 in disburser'
      ).to.changeTokenBalances(
        token$,
        [signer1.address, signer0.address, locker],
        [parseEther('-1'), parseEther('1'), parseEther('0')]
      );

      await controller$.updateFeeIds([], []);

      await expect(
        token$.connect(signerLP).transfer(signer0.address, parseEther('1')),
        'buy transfer from signer1 with signer1 in disburser but without trading fees'
      ).to.changeTokenBalances(
        token$,
        [tjoeLPWAVAX, controllerAddress, await distributor$.getAddress(), signer0.address],
        [parseEther('-1'), parseEther('0'), parseEther('0'), parseEther('1')]
      );

      await expect(
        token$.connect(signer0).transfer(tjoeLPWAVAX, parseEther('1')),
        'sell transfer from signer1 with signer1 in disburser but without trading fees'
      ).to.changeTokenBalances(
        token$,
        [tjoeLPWAVAX, controllerAddress, await distributor$.getAddress(), signer0.address],
        [parseEther('1'), parseEther('0'), parseEther('0'), parseEther('-1')]
      );

      await stopImpersonatingAccount(tjoeLPWAVAX);
    });
  });

  describe('Token Recovery', function () {
    it('should recover tokens except the configured token', async function () {
      await wrapper$.mint(await controller$.getAddress(), parseEther('10'));
      await expect(controller$.recoverToken(await token$.getAddress(), deployer.address)).to.be.revertedWithCustomError(
        controller$,
        'NotAllowed'
      );
      const exec = controller$.recoverToken(await wrapper$.getAddress(), deployer.address);
      await expect(exec).to.emit(controller$, 'RecoverToken');
      await expect(exec).to.changeTokenBalances(
        wrapper$,
        [await controller$.getAddress(), deployer.address],
        [parseEther('-10'), parseEther('10')]
      );
    });
  });
});
