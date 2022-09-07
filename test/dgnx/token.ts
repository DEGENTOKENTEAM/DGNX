import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers, network } from "hardhat";
import { tokens } from "./../helpers";

import * as dotenv from "dotenv";
dotenv.config();

const dexFactoryA = process.env.DEX_A_FACTORY || "";
const dexFactoryB = process.env.DEX_B_FACTORY || "";

describe("Token", () => {
  let owner: SignerWithAddress,
    receipientA: SignerWithAddress,
    receipientB: SignerWithAddress;
  let token: Contract,
    asset: Contract,
    controller: Contract,
    updatedController: Contract;

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: parseInt(process.env.NODE_BLOCK || ""),
        },
      },
    ]);

    [owner, receipientA, receipientB] = await ethers.getSigners();

    await network.provider.send("hardhat_setBalance", [
      owner.address,
      "0x487A9A304539440000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      receipientA.address,
      "0x487A9A304539440000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      receipientB.address,
      "0x487A9A304539440000",
    ]);

    token = await (await ethers.getContractFactory("DEGENX")).deploy();
    await token.deployed();

    asset = await (
      await ethers.getContractFactory("ERC20_Token_Sample")
    ).deploy();
    await asset.deployed();
  });

  describe("Defaults", () => {
    it("should transfer tokens", async () => {
      await (
        await token.connect(owner).transfer(receipientA.address, tokens(100000))
      ).wait();
      expect(await token.balanceOf(receipientA.address)).to.eq(tokens(100000));
    });
  });

  describe("Controller", () => {
    beforeEach(async () => {
      controller = await (
        await ethers.getContractFactory("DGNXController")
      ).deploy(token.address, asset.address);
      await controller.deployed();

      updatedController = await (
        await ethers.getContractFactory("DGNXController")
      ).deploy(token.address, asset.address);
      await updatedController.deployed();

      await (await controller.connect(owner).addFactory(dexFactoryA)).wait();
      await (
        await updatedController.connect(owner).addFactory(dexFactoryB)
      ).wait();
    });

    it("should be set first time", async () => {
      expect(await token.controller()).to.equal(ethers.constants.AddressZero);
      await (
        await token.connect(owner).updateController(controller.address)
      ).wait();
      expect(await token.controller()).to.equal(controller.address);
    });

    it("should be set controller and be tradeable with penalty", async () => {
      await (
        await token.connect(owner).updateController(controller.address)
      ).wait();
      await (
        await token.connect(owner).transfer(receipientA.address, tokens(100000))
      ).wait();
      expect(await token.balanceOf(receipientA.address)).to.eq(tokens(100000));
      await (
        await token
          .connect(receipientA)
          .transfer(receipientB.address, tokens(100000))
      ).wait();
      expect(await token.balanceOf(receipientB.address)).to.eq(tokens(1000));
    });

    it("should be set controller and be tradeable without penalty", async () => {
      await (
        await token.connect(owner).updateController(controller.address)
      ).wait();
      await (await controller.connect(owner).disableBotProtection()).wait();
      await (
        await token.connect(owner).transfer(receipientA.address, tokens(100000))
      ).wait();
      expect(await token.balanceOf(receipientA.address)).to.eq(tokens(100000));
      await (
        await token
          .connect(receipientA)
          .transfer(receipientB.address, tokens(100000))
      ).wait();
      expect(await token.balanceOf(receipientB.address)).to.eq(tokens(100000));
    });

    it("should be updated multiple times", async () => {
      expect(await token.controller()).to.equal(ethers.constants.AddressZero);
      await (
        await token.connect(owner).updateController(controller.address)
      ).wait();
      expect(await token.controller()).to.equal(controller.address);
      await (
        await token.connect(owner).updateController(updatedController.address)
      ).wait();
      expect(await token.controller()).to.equal(updatedController.address);
    });
  });
});
