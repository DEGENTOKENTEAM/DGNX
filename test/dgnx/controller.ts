import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { tokens, createPair, pairByAddress } from "./../helpers";

import * as dotenv from "dotenv";
dotenv.config();

const dexFactoryA = process.env.DEX_A_FACTORY || "";
const dexFactoryB = process.env.DEX_B_FACTORY || "";

describe("Controller", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress;
  let token: Contract,
    busd: Contract,
    tokenA: Contract,
    tokenB: Contract,
    tokenC: Contract,
    tokenD: Contract,
    controller: Contract,
    controllerNew: Contract;

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: parseInt(process.env.NODE_BLOCK || ""),
        },
      },
    ]);

    [owner, addr1, addr2] = await ethers.getSigners();

    token = await (await ethers.getContractFactory("DEGENX")).deploy();
    await token.deployed();

    await (await token.connect(owner).enable()).wait();

    busd = await (
      await ethers.getContractFactory("ERC20_Token_Sample")
    ).deploy();
    await busd.deployed();

    tokenA = await (
      await ethers.getContractFactory("ERC20_Token_Sample")
    ).deploy();
    await tokenA.deployed();

    tokenB = await (
      await ethers.getContractFactory("ERC20_Token_Sample")
    ).deploy();
    await tokenB.deployed();

    tokenC = await (
      await ethers.getContractFactory("ERC20_Token_Sample")
    ).deploy();
    await tokenC.deployed();

    tokenD = await (
      await ethers.getContractFactory("ERC20_Token_Sample")
    ).deploy();
    await tokenD.deployed();

    controller = await (
      await ethers.getContractFactory("DGNXController")
    ).deploy(token.address, busd.address);
    await controller.deployed();

    controllerNew = await (
      await ethers.getContractFactory("DGNXController")
    ).deploy(token.address, busd.address);
    await controllerNew.deployed();
  });

  describe("Updates", () => {
    it("should be able to set the controller initially", async () => {
      await (
        await token.connect(owner).updateController(controller.address)
      ).wait();

      expect(await token.controller()).to.equal(controller.address);
    });

    it("should be able to update the controller and process migration", async () => {
      await (
        await token.connect(owner).updateController(controller.address)
      ).wait();

      await (
        await token.connect(owner).transfer(controller.address, tokens(1000000))
      ).wait();

      expect(await token.balanceOf(controller.address)).to.equal(
        tokens(1000000)
      );

      await (
        await token.connect(owner).updateController(controllerNew.address)
      ).wait();

      expect(await token.controller()).to.equal(controllerNew.address);

      expect(await token.balanceOf(controller.address)).to.equal(tokens(0));

      expect(await token.balanceOf(controllerNew.address)).to.equal(
        tokens(1000000)
      );
    });

    it("should be able to update the controller and move all necessary assets to the new controller", async () => {
      const dexPairB = await createPair(
        owner,
        dexFactoryB,
        token.address,
        busd.address
      );
      const dexPairA = await createPair(
        owner,
        dexFactoryA,
        token.address,
        busd.address
      );

      const dexPairBContract = pairByAddress(owner, dexPairB);
      const dexPairAContract = pairByAddress(owner, dexPairA);

      await (
        await token.connect(owner).updateController(controller.address)
      ).wait();

      await (await controller.connect(owner).addFactory(dexFactoryB)).wait();
      await (await controller.connect(owner).addFactory(dexFactoryA)).wait();
      await (
        await controller.connect(owner).addPair(dexPairBContract.address, [])
      ).wait();
      await (
        await controller.connect(owner).addPair(dexPairAContract.address, [])
      ).wait();

      await (await controller.connect(owner).setMainPair(dexPairAContract.address, [])).wait(); // prettier-ignore

      await (await token.connect(owner).transfer(controller.address, tokens(1000000))).wait(); // prettier-ignore
      await (await token.connect(owner).transfer(addr1.address, tokens(1000000))).wait(); // prettier-ignore

      // fill token<>busd pool
      await (await token.connect(owner).transfer(dexPairBContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await busd.connect(owner).transfer(dexPairBContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await dexPairBContract.connect(owner).sync()).wait(); // prettier-ignore

      // fill token<>busd pool (pcs)
      await (await token.connect(owner).transfer(dexPairAContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await busd.connect(owner).transfer(dexPairAContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await dexPairAContract.connect(owner).sync()).wait(); // prettier-ignore

      await (
        await controller
          .connect(owner)
          .transferFees(addr1.address, dexPairBContract.address, tokens(50000))
      ).wait();

      expect(await dexPairBContract.balanceOf(controller.address)).to.eq(
        ethers.BigNumber.from("0")
      );
      expect(await dexPairAContract.balanceOf(controller.address)).to.eq(
        ethers.BigNumber.from("742224914518328546619")
      );
      expect(await token.balanceOf(controller.address)).to.eq(
        ethers.BigNumber.from("996003331315081602620430")
      );

      await (
        await token.connect(owner).updateController(controllerNew.address)
      ).wait();

      expect(await dexPairBContract.balanceOf(controller.address)).to.eq(
        ethers.BigNumber.from("0")
      );
      expect(await dexPairAContract.balanceOf(controller.address)).to.eq(
        ethers.BigNumber.from("0")
      );
      expect(await token.balanceOf(controller.address)).to.eq(
        ethers.BigNumber.from("0")
      );

      expect(await dexPairBContract.balanceOf(controllerNew.address)).to.eq(
        ethers.BigNumber.from("0")
      );
      expect(await dexPairAContract.balanceOf(controllerNew.address)).to.eq(
        ethers.BigNumber.from("742224914518328546619")
      );
      expect(await token.balanceOf(controllerNew.address)).to.eq(
        ethers.BigNumber.from("996003331315081602620430")
      );
    });
  });

  describe("Pairs", () => {
    let basePair: string;

    beforeEach(async () => {
      await (
        await token.connect(owner).updateController(controller.address)
      ).wait();
      await (await controller.connect(owner).addFactory(dexFactoryB)).wait();

      basePair = await createPair(
        owner,
        dexFactoryB,
        token.address,
        busd.address
      );
    });

    it("should be able to add a factory", async () => {
      await expect(controller.connect(owner).addFactory(dexFactoryA))
        .to.emit(controller, "FactoryAdded")
        .withArgs(dexFactoryA, owner.address);
    });

    it("should be able to add a non busd pair and check swapPath", async () => {
      await expect(controller.connect(owner).addPair(basePair, []))
        .to.emit(controller, "PairAdded")
        .withArgs(basePair, [], owner.address);

      const [pairDgnxTokenA, pairBusdTokenA] = [
        await createPair(owner, dexFactoryB, token.address, tokenA.address),
        await createPair(owner, dexFactoryB, tokenA.address, busd.address),
      ];

      await expect(
        controller.connect(owner).addPair(ethers.constants.AddressZero, [])
      ).to.be.revertedWith("no pair");

      await expect(controller.connect(owner).addPair(busd.address, [])).to.be
        .reverted;

      await expect(
        controller.connect(owner).addPair(pairDgnxTokenA, [])
      ).to.be.revertedWith("no busd token");

      await expect(
        controller.connect(owner).addPair(pairBusdTokenA, [])
      ).to.be.revertedWith("no dgnx");

      await expect(
        controller.connect(owner).addPair(pairDgnxTokenA, [busd.address])
      ).to.be.revertedWith("swap path needs 2 addresses");

      await expect(
        controller
          .connect(owner)
          .addPair(pairDgnxTokenA, [tokenA.address, token.address])
      ).to.be.revertedWith("wrong busd path");

      await expect(
        controller
          .connect(owner)
          .addPair(pairDgnxTokenA, [
            tokenA.address,
            tokenB.address,
            busd.address,
          ])
      ).to.be.revertedWith("invalid pair");

      await expect(
        controller
          .connect(owner)
          .addPair(pairDgnxTokenA, [tokenA.address, busd.address])
      )
        .to.emit(controller, "PairAdded")
        .withArgs(
          pairDgnxTokenA,
          [tokenA.address, busd.address],
          owner.address
        );

      await expect(
        controller.connect(owner).addPair(pairDgnxTokenA, [])
      ).to.be.revertedWith("pair already exists");
    });

    it("should be able to add multiple pairs", async () => {
      const [pairA, pairB] = [
        await createPair(owner, dexFactoryB, token.address, tokenA.address),
        await createPair(owner, dexFactoryB, token.address, tokenB.address),
        await createPair(owner, dexFactoryB, tokenA.address, busd.address),
        await createPair(owner, dexFactoryB, tokenB.address, tokenC.address),
        await createPair(owner, dexFactoryB, tokenC.address, busd.address),
      ];

      await (await controller.connect(owner).addPair(basePair, [])).wait();
      await (await controller.connect(owner).addPair(pairA, [tokenA.address, busd.address])).wait(); // prettier-ignore
      await (await controller.connect(owner).addPair(pairB, [tokenB.address, tokenC.address, busd.address])).wait(); // prettier-ignore

      expect(await controller.getAllPairs())
        .contains(basePair)
        .contains(pairA)
        .contains(pairB);
    });

    it("should be able to remove pairs", async () => {
      await expect(
        controller.connect(owner).removePair(basePair)
      ).to.be.revertedWith("no pair");
      await (await controller.connect(owner).addPair(basePair, [])).wait();
      await (await controller.connect(owner).removePair(basePair)).wait();
    });
  });

  describe("Flags", () => {
    it("should be able to set liquidity booster threshold", async () => {
      await (
        await controller.connect(owner).setLiquidityThreshold(tokens(1001))
      ).wait();
      expect(await controller.liquidityThreshold()).to.equal(tokens(1001));
    });

    it("should be not possible to set a liquidity booster threshold below 1000", async () => {
      await expect(controller.connect(owner).setLiquidityThreshold(tokens(999)))
        .to.be.reverted;
    });

    it("should be able to set liquidity backing threshold", async () => {
      await (
        await controller.connect(owner).setBackingThreshold(tokens(10))
      ).wait();
      expect(await controller.backingThreshold()).to.equal(tokens(10));
    });

    it("should be able to set platform threshold", async () => {
      await (
        await controller.connect(owner).setPlatformThreshold(tokens(10))
      ).wait();
      expect(await controller.platformThreshold()).to.equal(tokens(10));
    });

    it("should be able to set launchpad threshold", async () => {
      await (
        await controller.connect(owner).setInvestmentFundThreshold(tokens(10))
      ).wait();
      expect(await controller.investmentFundThreshold()).to.equal(tokens(10));
    });

    it("should be able to set burn tax", async () => {
      await (await controller.connect(owner).setBurnTax(100)).wait();
      expect(await controller.burnTax()).to.equal(100);
    });

    it("should be able to set backing tax", async () => {
      await (await controller.connect(owner).setBackingTax(100)).wait();
      expect(await controller.backingTax()).to.equal(100);
    });

    it("should be able to set liquidity tax", async () => {
      await (await controller.connect(owner).setLiquidityTax(100)).wait();
      expect(await controller.liquidityTax()).to.equal(100);
    });

    it("should be able to set marketing tax", async () => {
      await (await controller.connect(owner).setMarketingTax(100)).wait();
      expect(await controller.marketingTax()).to.equal(100);
    });

    it("should be able to set platform tax", async () => {
      await (await controller.connect(owner).setPlatformTax(100)).wait();
      expect(await controller.platformTax()).to.equal(100);
    });

    it("should be able to set investment fund tax", async () => {
      await (await controller.connect(owner).setInvestmentFundTax(100)).wait();
      expect(await controller.investmentFundTax()).to.equal(100);
    });

    it("should be not possible to set liquidity backing below 10", async () => {
      await expect(controller.connect(owner).setLiquidityThreshold(tokens(9)))
        .to.be.reverted;
    });

    it("should be able to disable fee", async () => {
      await (await controller.connect(owner).feeOff()).wait();
      expect(await controller.applyFee()).to.be.false;
    });

    it("should be able to enable fee after disabling it", async () => {
      await (await controller.connect(owner).feeOff()).wait();
      await (await controller.connect(owner).feeOn()).wait();
      expect(await controller.applyFee()).to.be.true;
    });
  });

  describe("Allowance", () => {
    it("should allow other contracts to interact with controller", async () => {
      await (
        await controller.connect(owner).allowContract(controllerNew.address)
      ).wait();
    });
    it("should check if another contract has allowance", async () => {
      await (
        await controller.connect(owner).allowContract(controllerNew.address)
      ).wait();
      expect(await controller.isAllowed(controllerNew.address)).to.be.true;
    });
    it("should be able to remove a contract from the allowance list", async () => {
      await (
        await controller.connect(owner).allowContract(controllerNew.address)
      ).wait();
      expect(await controller.isAllowed(controllerNew.address)).to.be.true;
      await (
        await controller.connect(owner).removeContract(controllerNew.address)
      ).wait();
      expect(await controller.isAllowed(controllerNew.address)).to.be.false;
    });
  });

  describe("Taxation", () => {
    let dexAPair: string,
      dexBPair: string,
      dexBPairNonBUSD: string,
      dexBPairNonToken: string;

    beforeEach(async () => {
      dexAPair = await createPair(
        owner,
        dexFactoryB,
        token.address,
        busd.address
      );
      dexBPair = await createPair(
        owner,
        dexFactoryA,
        token.address,
        busd.address
      );
      dexBPairNonBUSD = await createPair(
        owner,
        dexFactoryA,
        token.address,
        tokenA.address
      );
      dexBPairNonToken = await createPair(
        owner,
        dexFactoryA,
        tokenA.address,
        busd.address
      );

      await (await controller.connect(owner).addFactory(dexFactoryB)).wait();
      await (await controller.connect(owner).addFactory(dexFactoryA)).wait();
      await (await controller.connect(owner).addPair(dexAPair, [])).wait();
      await (await controller.connect(owner).addPair(dexBPair, [])).wait();

      await (await controller.connect(owner).setMainPair(dexAPair, [])).wait(); // prettier-ignore
    });

    it("should estimate amount when there is no pair involved in a transaction", async () => {
      const [amount] = await controller
        .connect(owner)
        .estimateTransferFees(addr1.address, addr2.address, tokens(1));

      expect(amount).to.eq(tokens(1));
    });

    it("should estimate amount and fees when there is a registered pair involved", async () => {
      const [amount, liquidity, backing, burn, marketing, platform, launchpad] =
        await controller
          .connect(owner)
          .estimateTransferFees(addr1.address, dexAPair, tokens(1000));

      expect(amount).to.eq(tokens(900));
      expect(platform).to.eq(tokens(20));
      expect(liquidity).to.eq(tokens(30));
      expect(backing).to.eq(tokens(20));
      expect(burn).to.eq(tokens(10));
      expect(marketing).to.eq(tokens(10));
      expect(launchpad).to.eq(tokens(20));
    });

    it("should transfer fees when there is a registered pair involved", async () => {
      const dexAPairContract = pairByAddress(owner, dexAPair);
      const dexBPairContract = pairByAddress(owner, dexBPair);

      await (await token.connect(owner).transfer(addr1.address, tokens(1000000))).wait(); // prettier-ignore
      await (await token.connect(owner).transfer(controller.address, tokens(1000000))).wait(); // prettier-ignore

      // fill token<>busd pool (dex a)
      await (await token.connect(owner).transfer(dexAPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await busd.connect(owner).transfer(dexAPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await dexAPairContract.connect(owner).sync()).wait(); // prettier-ignore

      // fill token<>busd pool (dex b)
      await (await token.connect(owner).transfer(dexBPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await busd.connect(owner).transfer(dexBPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await dexBPairContract.connect(owner).sync()).wait(); // prettier-ignore

      await (
        await controller
          .connect(owner)
          .transferFees(addr1.address, dexAPairContract.address, tokens(50000))
      ).wait();
    });

    it("should transfer fees when there is a registered non busd pair involved", async () => {
      const dexAPairContract = pairByAddress(owner, dexAPair);
      const dexBPairContract = pairByAddress(owner, dexBPair);
      const dexBPairNonBUSDContract = pairByAddress(owner, dexBPairNonBUSD);
      const dexBPairNonTokenContract = pairByAddress(owner, dexBPairNonToken);

      await (await token.connect(owner).transfer(controller.address, tokens(1000000))).wait(); // prettier-ignore
      await (await token.connect(owner).transfer(addr1.address, tokens(1000000))).wait(); // prettier-ignore

      // add additional pair
      await (await controller.connect(owner).addPair(dexBPairNonBUSD, [tokenA.address, busd.address])).wait(); // prettier-ignore

      // fill token<>busd pool
      await (await token.connect(owner).transfer(dexAPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await busd.connect(owner).transfer(dexAPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await dexAPairContract.connect(owner).sync()).wait(); // prettier-ignore

      // fill token<>busd pool (pcs)
      await (await token.connect(owner).transfer(dexBPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await busd.connect(owner).transfer(dexBPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await dexBPairContract.connect(owner).sync()).wait(); // prettier-ignore

      // fill token<>tokenA pool
      await (await token.connect(owner).transfer(dexBPairNonBUSDContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await tokenA.connect(owner).transfer(dexBPairNonBUSDContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await dexBPairNonBUSDContract.connect(owner).sync()).wait(); // prettier-ignore

      // fill tokenA<>busd pool
      await (await tokenA.connect(owner).transfer(dexBPairNonTokenContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await busd.connect(owner).transfer(dexBPairNonTokenContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await dexBPairNonTokenContract.connect(owner).sync()).wait(); // prettier-ignore

      await (
        await controller
          .connect(owner)
          .transferFees(
            addr1.address,
            dexBPairNonBUSDContract.address,
            tokens(50000)
          )
      ).wait();
    });
  });

  describe("Liquidity Booster", () => {
    let dexAPair: string, pcsPair: string;
    let dexAPairContract: Contract, dexBPairContract: Contract;
    beforeEach(async () => {
      dexAPair = await createPair(
        owner,
        dexFactoryB,
        token.address,
        busd.address
      );
      pcsPair = await createPair(
        owner,
        dexFactoryA,
        token.address,
        busd.address
      );

      dexAPairContract = pairByAddress(owner, dexAPair);
      dexBPairContract = pairByAddress(owner, pcsPair);

      await (await controller.connect(owner).addFactory(dexFactoryB)).wait();
      await (await controller.connect(owner).addFactory(dexFactoryA)).wait();
      await (
        await controller.connect(owner).addPair(dexAPairContract.address, [])
      ).wait();
      await (
        await controller.connect(owner).addPair(dexBPairContract.address, [])
      ).wait();

      await (await controller.connect(owner).setMainPair(dexBPairContract.address, [])).wait(); // prettier-ignore

      await (await token.connect(owner).transfer(controller.address, tokens(1000000))).wait(); // prettier-ignore
      await (await token.connect(owner).transfer(addr1.address, tokens(1000000))).wait(); // prettier-ignore

      // fill token<>busd pool
      await (await token.connect(owner).transfer(dexAPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await busd.connect(owner).transfer(dexAPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await dexAPairContract.connect(owner).sync()).wait(); // prettier-ignore

      // fill token<>busd pool (pcs)
      await (await token.connect(owner).transfer(dexBPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await busd.connect(owner).transfer(dexBPairContract.address, tokens(100000))).wait(); // prettier-ignore
      await (await dexBPairContract.connect(owner).sync()).wait(); // prettier-ignore
    });

    it("should distribute liquidity to the main pair automatically on trade", async () => {
      await expect(
        controller
          .connect(owner)
          .transferFees(addr1.address, dexAPairContract.address, tokens(10000))
      ).to.emit(controller, "DistributeLiquidity");
    });

    it("should distribute liquidity to the main pair manually", async () => {
      await (
        await controller
          .connect(owner)
          .transferFees(addr1.address, dexBPairContract.address, tokens(50000))
      ).wait();

      await expect(
        controller.connect(owner).distributeLiquidityToMainPool()
      ).to.emit(controller, "DistributeLiquidity");
    });
  });

  describe("General", () => {
    it("should be able to recover tokens which are not meant to be on contract", async () => {
      await (
        await tokenA.connect(owner).transfer(controller.address, tokens(20000))
      ).wait();

      expect(await tokenA.balanceOf(controller.address)).to.eq(tokens(20000));

      await (
        await controller
          .connect(owner)
          .recoverToken(tokenA.address, addr1.address)
      ).wait();

      expect(await tokenA.balanceOf(addr1.address)).to.eq(tokens(20000));
    });
  });
});
