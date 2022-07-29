import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
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
    busd: Contract,
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

    token = await (await ethers.getContractFactory("DEGENX")).deploy();
    await token.deployed();

    busd = await (
      await ethers.getContractFactory("ERC20_Token_Sample")
    ).deploy();
    await busd.deployed();
  });

  describe("Defaults", () => {
    it("should be disabled on start", async () => {
      expect(await token.connect(owner).enabled()).to.be.false;
      await (await token.connect(owner).enable()).wait();
      expect(await token.connect(owner).enabled()).to.be.true;
    });

    it("should transfer tokens", async () => {
      await (await token.connect(owner).enable()).wait();
      await (
        await token.connect(owner).transfer(receipientA.address, tokens(100000))
      ).wait();
      expect(await token.balanceOf(receipientA.address)).to.eq(tokens(100000));
    });
  });

  describe("Controller", () => {
    beforeEach(async () => {
      await (await token.connect(owner).enable()).wait();

      controller = await (
        await ethers.getContractFactory("DGNXController")
      ).deploy(token.address, busd.address);
      await controller.deployed();

      updatedController = await (
        await ethers.getContractFactory("DGNXController")
      ).deploy(token.address, busd.address);
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
