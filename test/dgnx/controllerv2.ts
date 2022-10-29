import { expect } from "chai";
import { ethers, network } from "hardhat";

import * as dotenv from "dotenv";
import { BigNumber, Contract } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { addresses, contracts } from "../../scripts/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
dotenv.config();

describe("Controller", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    addr4: SignerWithAddress;
  let token: Contract,
    wavax: Contract,
    locker: Contract,
    routerTJOE: Contract,
    routerPANGO: Contract,
    factoryTJOE: Contract,
    factoryPANGO: Contract,
    pairTJOE: Contract,
    pairPANGO: Contract,
    controllerOld: Contract,
    controller: Contract;

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: 19703426,
        },
      },
    ]);

    [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    await network.provider.send("hardhat_setBalance", [
      owner.address,
      "0x487A9A304539440000",
    ]);

    await network.provider.send("hardhat_setBalance", [
      addr1.address,
      "0x487A9A304539440000",
    ]);

    await network.provider.send("hardhat_setBalance", [
      addr2.address,
      "0x487A9A304539440000",
    ]);

    await network.provider.send("hardhat_setBalance", [
      addr3.address,
      "0x487A9A304539440000",
    ]);

    ({
      token,
      wavax,
      locker,
      routerTJOE,
      routerPANGO,
      factoryTJOE,
      factoryPANGO,
      pairTJOE,
      pairPANGO,
      controller: controllerOld,
    } = await contracts());

    controller = await (
      await ethers.getContractFactory("DGNXControllerV2")
    ).deploy(
      token.address,
      addresses.WAVAX,
      [factoryTJOE.address, factoryPANGO.address],
      [pairTJOE.address, pairPANGO.address],
      pairTJOE.address
    );
    await controller.deployed();

    await (await controller.allowContract(locker.address)).wait();
  });

  describe("Update", () => {
    it("should be able to update the controller and process migration", async () => {
      const burnAddress = await controller.DEAD();
      const marketingAddress = await controller.MARKETING();
      const platformAddress = await controller.PLATFORM();
      const balanceDgnx: BigNumber = await token.balanceOf(
        controllerOld.address
      );
      const burnedDgnx: BigNumber = await token.balanceOf(burnAddress);
      const balanceWavax: BigNumber = await wavax.balanceOf(
        controllerOld.address
      );
      const marketingWavax: BigNumber = await wavax.balanceOf(marketingAddress);
      const balancePairMain: BigNumber = await pairTJOE.balanceOf(
        controllerOld.address
      );
      const balancePairMainPlatform: BigNumber = await pairTJOE.balanceOf(
        platformAddress
      );

      await (await token.updateController(controller.address)).wait();

      expect(await token.balanceOf(burnAddress)).to.eq(
        balanceDgnx.add(burnedDgnx)
      );
      expect(await wavax.balanceOf(marketingAddress)).to.eq(
        balanceWavax.add(marketingWavax)
      );
      expect(await pairTJOE.balanceOf(platformAddress)).to.eq(
        balancePairMain.add(balancePairMainPlatform)
      );
    });
  });

  describe("Pairs and Factories", () => {
    beforeEach(async () => {
      await (await token.updateController(controller.address)).wait();
    });

    it("should be able to add a factory", async () => {
      await expect(
        controller.addFactory("0x1234123412341234123412341234123412341234")
      )
        .to.emit(controller, "FactoryAdded")
        .withArgs("0x1234123412341234123412341234123412341234", owner.address);
    });

    it("should be able to add a non wavax pair and check swapPath", async () => {
      const tokenA = await (
        await ethers.getContractFactory("ERC20_Token_Sample")
      ).deploy("Dummy Token A", "TokenA");
      await tokenA.deployed();

      const tokenB = await (
        await ethers.getContractFactory("ERC20_Token_Sample")
      ).deploy("Dummy Token B", "TokenB");
      await tokenB.deployed();

      const tokenC = await (
        await ethers.getContractFactory("ERC20_Token_Sample")
      ).deploy("Dummy Token C", "TokenC");
      await tokenC.deployed();

      await (
        await factoryTJOE.createPair(token.address, tokenA.address)
      ).wait();
      await (
        await factoryTJOE.createPair(token.address, tokenB.address)
      ).wait();
      await (
        await factoryTJOE.createPair(token.address, tokenC.address)
      ).wait();
      await (
        await factoryTJOE.createPair(tokenC.address, tokenB.address)
      ).wait();
      await (
        await factoryTJOE.createPair(tokenA.address, wavax.address)
      ).wait();
      await (
        await factoryTJOE.createPair(tokenB.address, wavax.address)
      ).wait();

      const pairA = await factoryTJOE.getPair(token.address, tokenA.address);
      const pairB = await factoryTJOE.getPair(token.address, tokenB.address);
      const pairC = await factoryTJOE.getPair(token.address, tokenC.address);
      const noLegitPairA = await factoryTJOE.getPair(
        tokenC.address,
        tokenB.address
      );
      const noLegitPairB = await factoryTJOE.getPair(
        tokenA.address,
        wavax.address
      );

      await expect(
        controller.addPair(ethers.constants.AddressZero, [])
      ).to.be.revertedWith("DGNXController::addPair no pair");

      await expect(controller.addPair(wavax.address, [])).to.be.reverted;

      await expect(controller.addPair(noLegitPairA, [])).to.be.revertedWith(
        "DGNXController::addPair no dgnx"
      );

      await expect(controller.addPair(noLegitPairB, [])).to.be.revertedWith(
        "DGNXController::addPair no dgnx"
      );

      await expect(
        controller.addPair(pairA, [wavax.address])
      ).to.be.revertedWith(
        "DGNXController::addPair swap path needs 2 addresses"
      );

      await expect(
        controller.addPair(pairA, [tokenA.address, token.address])
      ).to.be.revertedWith("DGNXController::addPair wrong wavax path");

      await expect(
        controller.addPair(pairA, [
          tokenA.address,
          tokenB.address,
          wavax.address,
        ])
      ).to.be.revertedWith("DGNXController::addPair invalid pair");

      await expect(controller.addPair(pairA, [tokenA.address, wavax.address]))
        .to.emit(controller, "PairAdded")
        .withArgs(pairA, [tokenA.address, wavax.address], owner.address);

      await expect(controller.addPair(pairB, [tokenB.address, wavax.address]))
        .to.emit(controller, "PairAdded")
        .withArgs(pairB, [tokenB.address, wavax.address], owner.address);

      await expect(
        controller.addPair(pairC, [
          tokenC.address,
          tokenB.address,
          wavax.address,
        ])
      )
        .to.emit(controller, "PairAdded")
        .withArgs(
          pairC,
          [tokenC.address, tokenB.address, wavax.address],
          owner.address
        );

      await expect(
        controller.addPair(pairA, [tokenA.address, wavax.address])
      ).to.be.revertedWith("DGNXController::addPair pair already exists");

      expect(await controller.getAllPairs())
        .contains(pairA)
        .contains(pairB)
        .contains(pairC);
    });

    it("should be able to remove pairs", async () => {
      const tokenA = await (
        await ethers.getContractFactory("ERC20_Token_Sample")
      ).deploy("Dummy Token A", "TokenA");
      await tokenA.deployed();

      await (
        await factoryTJOE.createPair(token.address, tokenA.address)
      ).wait();
      await (
        await factoryTJOE.createPair(tokenA.address, wavax.address)
      ).wait();

      const pairA = await factoryTJOE.getPair(token.address, tokenA.address);

      await expect(controller.removePair(pairA)).to.be.revertedWith(
        "DGNXController::removePair no pair"
      );
      await (
        await controller.addPair(pairA, [tokenA.address, wavax.address])
      ).wait();
      await (await controller.removePair(pairA)).wait();
    });
  });

  describe("Setter", () => {
    it("should set liquidity booster threshold", async () => {
      await expect(
        controller.connect(owner).setLiquidityThreshold(parseEther("1337"))
      )
        .to.emit(controller, "SetLiquidityThreshold")
        .withArgs(owner.address, parseEther("1337"));
      expect(await controller.liquidityThreshold()).to.equal(
        parseEther("1337")
      );
    });

    it("should set liquidity booster threshold to zero", async () => {
      await expect(
        controller.connect(owner).setLiquidityThreshold(parseEther("0"))
      )
        .to.emit(controller, "SetLiquidityThreshold")
        .withArgs(owner.address, parseEther("0"));
      expect(await controller.liquidityThreshold()).to.equal(parseEther("0"));
    });

    it("should be able to set burn tax", async () => {
      await expect(controller.connect(owner).setBurnTax(100))
        .to.emit(controller, "SetBurnTax")
        .withArgs(owner.address, 100);

      expect(await controller.burnTax()).to.equal(100);
    });

    it("should be able to set backing tax", async () => {
      await expect(controller.connect(owner).setBackingTax(100))
        .to.emit(controller, "SetBackingTax")
        .withArgs(owner.address, 100);

      expect(await controller.backingTax()).to.equal(100);
    });

    it("should be able to set liquidity tax", async () => {
      await expect(controller.connect(owner).setLiquidityTax(100))
        .to.emit(controller, "SetLiquidityTax")
        .withArgs(owner.address, 100);

      expect(await controller.liquidityTax()).to.equal(100);
    });

    it("should be able to set marketing tax", async () => {
      await expect(controller.connect(owner).setMarketingTax(100))
        .to.emit(controller, "SetMarketingTax")
        .withArgs(owner.address, 100);

      expect(await controller.marketingTax()).to.equal(100);
    });

    it("should be able to set platform tax", async () => {
      await expect(controller.connect(owner).setPlatformTax(100))
        .to.emit(controller, "SetPlatformTax")
        .withArgs(owner.address, 100);

      expect(await controller.platformTax()).to.equal(100);
    });

    it("should be able to set investment fund tax", async () => {
      await expect(controller.connect(owner).setInvestmentFundTax(100))
        .to.emit(controller, "SetInvestmentFundTax")
        .withArgs(owner.address, 100);

      expect(await controller.investmentFundTax()).to.equal(100);
    });

    it("should be able to disable fee", async () => {
      await (await controller.connect(owner).feeOff()).wait();
      expect(await controller.applyFee()).to.be.false;
    });

    it("should be able to enable fee after disabling it", async () => {
      await expect(controller.feeOff())
        .to.emit(controller, "TurnFeesOff")
        .withArgs(owner.address);

      await expect(controller.feeOn())
        .to.emit(controller, "TurnFeesOn")
        .withArgs(owner.address);

      expect(await controller.applyFee()).to.be.true;
    });
  });

  describe("Allowance", () => {
    it("should allow other contracts to interact with controller", async () => {
      await (
        await controllerOld.connect(owner).allowContract(controller.address)
      ).wait();
    });

    it("should check if another contract has allowance", async () => {
      await (
        await controllerOld.connect(owner).allowContract(controller.address)
      ).wait();
      expect(await controllerOld.isAllowed(controller.address)).to.be.true;
    });

    it("should be able to remove a contract from the allowance list", async () => {
      await expect(
        controllerOld.connect(owner).allowContract(controller.address)
      )
        .to.emit(controllerOld, "AllowContract")
        .withArgs(owner.address, controller.address);
      expect(await controllerOld.isAllowed(controller.address)).to.be.true;

      await expect(
        controllerOld.connect(owner).removeContract(controller.address)
      )
        .to.emit(controllerOld, "RemoveContract")
        .withArgs(owner.address, controller.address);

      expect(await controllerOld.isAllowed(controller.address)).to.be.false;
    });
  });

  describe("Taxation", () => {
    beforeEach(async () => {
      await (await token.updateController(controller.address)).wait();
    });

    it("should be applied correctly and funds transferred correctly", async () => {
      const devWallet = "0xdF090f6675034Fde637031c6590FD1bBeBc4fa45";
      const platformWallet = "0xca01a9d36f47561f03226b6b697b14b9274b1b10";
      const investmentWallet = "0x829619513F202e1bFD8929f656EF96bac73BDAe8";
      const marketingWallet = "0x16eF18E42A7d72E52E9B213D7eABA269B90A4643";

      await (
        await controller.setLiquidityThreshold(BigNumber.from("10"))
      ).wait();

      await expect(
        routerTJOE
          .connect(addr1)
          .swapExactAVAXForTokens(
            parseEther("0"),
            [wavax.address, token.address],
            addr1.address,
            2000000000,
            {
              value: parseEther("1"),
            }
          )
      )
        .to.emit(wavax, "Deposit")
        .withArgs(routerTJOE.address, parseEther("1"))
        .to.emit(wavax, "Transfer")
        .withArgs(routerTJOE.address, pairTJOE.address, parseEther("1"))
        .to.emit(token, "Transfer")
        .withArgs(
          pairTJOE.address,
          controller.address,
          BigNumber.from("133244959539484521378")
        )
        .to.emit(token, "Transfer")
        .withArgs(
          controller.address,
          pairPANGO.address,
          BigNumber.from("13324495953948452135")
        )
        .to.emit(wavax, "Transfer")
        .withArgs(
          pairPANGO.address,
          controller.address,
          BigNumber.from("100110412515103740")
        )
        .to.emit(pairPANGO, "Sync")
        .withArgs(
          BigNumber.from("433148892927338969100175"),
          BigNumber.from("3264052625250550003239")
        )
        .to.emit(pairPANGO, "Swap")
        .withArgs(
          controller.address,
          BigNumber.from("13324495953948452135"),
          BigNumber.from("0"),
          BigNumber.from("0"),
          BigNumber.from("100110412515103740"),
          controller.address
        )
        .to.emit(wavax, "Transfer")
        .withArgs(
          controller.address,
          wavax.address,
          BigNumber.from("20022082503020748")
        )
        .to.emit(wavax, "Transfer")
        .withArgs(
          controller.address,
          devWallet,
          BigNumber.from("8008833001208299")
        )
        .to.emit(wavax, "Transfer")
        .withArgs(
          controller.address,
          platformWallet,
          BigNumber.from("12013249501812449")
        )
        .to.emit(wavax, "Transfer")
        .withArgs(
          controller.address,
          investmentWallet,
          BigNumber.from("20022082503020748")
        )
        .to.emit(wavax, "Transfer")
        .withArgs(
          controller.address,
          marketingWallet,
          BigNumber.from("10011041251510373")
        )
        .to.emit(token, "Transfer")
        .withArgs(
          controller.address,
          addr1.address,
          BigNumber.from("119920463585536069243")
        )
        .to.emit(pairTJOE, "Sync")
        .withArgs(
          BigNumber.from("466420388710611606362510"),
          BigNumber.from("3490971621828440815665")
        )
        .to.emit(pairTJOE, "Swap")
        .withArgs(
          routerTJOE.address,
          BigNumber.from("0"),
          BigNumber.from("1000000000000000000"),
          BigNumber.from("133244959539484521378"),
          BigNumber.from("0"),
          addr1.address
        );

      expect(await token.balanceOf(addr1.address)).to.eq(
        BigNumber.from("119920463585536069243")
      );
      expect(await controller.liquidityWAVAX()).to.eq(
        BigNumber.from("30033123754531123")
      );

      await expect(
        routerPANGO
          .connect(addr1)
          .swapExactAVAXForTokens(
            parseEther("0"),
            [wavax.address, token.address],
            addr1.address,
            2000000000,
            {
              value: parseEther("600"),
            }
          )
      )
        .to.emit(pairTJOE, "Mint")
        .withArgs(
          controller.address,
          BigNumber.from("1014552353510100231223"),
          BigNumber.from("7411817372160526937")
        );

      expect(await controller.liquidityWAVAX()).to.eq(
        BigNumber.from("6313173777825311")
      );
    });

    it("should have no tax on wallet to wallet transfer", async () => {
      await (
        await locker.withdraw(addr1.address, parseEther("1000"), 0)
      ).wait();
      await (
        await locker.withdraw(addr2.address, parseEther("1000"), 0)
      ).wait();
      expect(await token.balanceOf(addr1.address)).to.eq(parseEther("1000"));
      expect(await token.balanceOf(addr2.address)).to.eq(parseEther("1000"));
      await token.connect(addr1).transfer(addr2.address, parseEther("1000"));
      expect(await token.balanceOf(addr2.address)).to.eq(parseEther("2000"));
    });

    it("should apply taxes while providing liquidity", async () => {
      const pairBalanceDgnxBefore: BigNumber = await token.balanceOf(
        pairTJOE.address
      );
      const pairBalanceWavaxBefore: BigNumber = await wavax.balanceOf(
        pairTJOE.address
      );
      await (
        await locker.withdraw(addr1.address, parseEther("1000"), 0)
      ).wait();

      await (
        await token
          .connect(addr1)
          .approve(routerTJOE.address, parseEther("1000"))
      ).wait();

      await (
        await routerTJOE
          .connect(addr1)
          .addLiquidityAVAX(
            token.address,
            parseEther("1000"),
            parseEther("0"),
            parseEther("0"),
            addr1.address,
            2000000000,
            {
              value: parseEther("8"),
            }
          )
      ).wait();

      const pairBalanceDgnxAfter: BigNumber = await token.balanceOf(
        pairTJOE.address
      );
      const pairBalanceWavaxAfter: BigNumber = await wavax.balanceOf(
        pairTJOE.address
      );

      expect(pairBalanceDgnxAfter.sub(pairBalanceDgnxBefore)).to.eq(
        BigNumber.from("900000000000000000000")
      );
      expect(pairBalanceWavaxAfter.sub(pairBalanceWavaxBefore)).to.eq(
        BigNumber.from("7480322453764912732")
      );
    });

    it("should estimate the taxes correctly on buy", async () => {
      const [
        amount,
        liquidity,
        backing,
        burn,
        marketing,
        platform,
        investment,
      ] = await controller
        .connect(owner)
        .estimateTransferFees(
          pairTJOE.address,
          addr1.address,
          parseEther("1000")
        );
      expect(amount).to.eq(parseEther("900"));
      expect(liquidity).to.eq(parseEther("30"));
      expect(backing).to.eq(parseEther("20"));
      expect(burn).to.eq(parseEther("0"));
      expect(marketing).to.eq(parseEther("10"));
      expect(platform).to.eq(parseEther("20"));
      expect(investment).to.eq(parseEther("20"));
    });

    it("should estimate the taxes correctly on sell", async () => {
      const [
        amount,
        liquidity,
        backing,
        burn,
        marketing,
        platform,
        investment,
      ] = await controller
        .connect(owner)
        .estimateTransferFees(
          addr1.address,
          pairTJOE.address,
          parseEther("1000")
        );
      expect(amount).to.eq(parseEther("900"));
      expect(liquidity).to.eq(parseEther("30"));
      expect(backing).to.eq(parseEther("20"));
      expect(burn).to.eq(parseEther("10"));
      expect(marketing).to.eq(parseEther("0"));
      expect(platform).to.eq(parseEther("20"));
      expect(investment).to.eq(parseEther("20"));
    });

    it("should estimate the taxes correctly on transfer", async () => {
      const [
        amount,
        liquidity,
        backing,
        burn,
        marketing,
        platform,
        investment,
      ] = await controller
        .connect(owner)
        .estimateTransferFees(addr1.address, addr2.address, parseEther("1000"));
      expect(amount).to.eq(parseEther("1000"));
      expect(liquidity).to.eq(parseEther("0"));
      expect(backing).to.eq(parseEther("0"));
      expect(burn).to.eq(parseEther("0"));
      expect(marketing).to.eq(parseEther("0"));
      expect(platform).to.eq(parseEther("0"));
      expect(investment).to.eq(parseEther("0"));
    });
  });

  describe("Disburser Taxation", () => {
    it("should be applied", async () => {
      await (await token.updateController(controller.address)).wait();

      const { disburser } = await contracts();
      await (
        await disburser.addAddresses(
          [addr1.address, addr2.address],
          [parseEther("100000"), parseEther("100000")]
        )
      ).wait();

      await (await disburser.connect(addr1).claimStart()).wait();
      await (await disburser.connect(addr2).claimStart()).wait();

      expect(await token.balanceOf(addr1.address)).to.eq(parseEther("10000"));
      expect(await token.balanceOf(addr2.address)).to.eq(parseEther("10000"));

      await (
        await token.connect(addr2).transfer(addr1.address, parseEther("10000"))
      ).wait();

      expect(await token.balanceOf(addr1.address)).to.eq(parseEther("19500"));

      await (
        await token.connect(addr1).transfer(addr3.address, parseEther("19500"))
      ).wait();

      expect(await token.balanceOf(addr3.address)).to.eq(parseEther("19500"));

      await (
        await token.connect(addr3).transfer(addr4.address, parseEther("19500"))
      ).wait();

      expect(await token.balanceOf(addr4.address)).to.eq(parseEther("19500"));
    });
  });

  describe("General", () => {
    it("should be able to recover tokens which are not meant to be on contract", async () => {
      const tokenA = await (
        await ethers.getContractFactory("ERC20_Token_Sample")
      ).deploy("Dummy Token A", "TokenA");
      await tokenA.deployed();

      await (
        await tokenA
          .connect(owner)
          .transfer(controller.address, parseEther("1"))
      ).wait();
      expect(await tokenA.balanceOf(controller.address)).to.eq(parseEther("1"));
      await expect(
        controller.connect(owner).recoverToken(tokenA.address, addr1.address)
      )
        .to.emit(controller, "RecoverToken")
        .withArgs(owner.address, tokenA.address, parseEther("1"));
      expect(await tokenA.balanceOf(addr1.address)).to.eq(parseEther("1"));
    });
  });
});
