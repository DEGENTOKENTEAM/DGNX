import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { contracts } from "./../../scripts/dgnx/helpers";

import * as dotenv from "dotenv";
import { parseEther } from "ethers/lib/utils";
import { addresses } from "../../scripts/dgnx/helpers/index";
dotenv.config();

describe("Token", () => {
  let owner: SignerWithAddress;
  let launcher: Contract;

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: parseInt(process.env.NODE_BLOCK || ""),
        },
      },
    ]);

    [owner] = await ethers.getSigners();

    launcher = await (await ethers.getContractFactory("DGNXLauncher")).deploy();
    await launcher.deployed();
  });

  it("should launch", async () => {
    const { token, controller, sale, locker, pairTJOE, pairPANGO } =
      await contracts();

    const ownerBalanceBefore = await owner.getBalance();
    await sale.finishSale();
    const ownerBalanceAfter = await owner.getBalance();
    const transferAmount = ownerBalanceAfter.sub(ownerBalanceBefore);
    expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    expect(transferAmount).to.be.gt(parseEther("0"));

    const ownerAssets = await token.balanceOf(owner.address);
    await token
      .connect(owner)
      .transfer(launcher.address, await token.balanceOf(owner.address));
    expect(await token.balanceOf(launcher.address)).to.eq(ownerAssets);

    await owner.sendTransaction({
      to: launcher.address,
      value: transferAmount,
    });
    expect(await ethers.provider.getBalance(launcher.address)).to.eq(
      transferAmount
    );

    expect(await token.owner()).to.eq(owner.address);
    expect(await controller.owner()).to.eq(owner.address);
    await token.transferOwnership(launcher.address);
    await controller.transferOwnership(launcher.address);
    expect(await token.owner()).to.eq(launcher.address);
    expect(await controller.owner()).to.eq(launcher.address);

    expect(await token.balanceOf(locker.address)).to.eq(parseEther("0"));

    await launcher.launch({
      gasLimit: ethers.utils.parseUnits("7000000", "wei"),
    });

    /// multiple checks

    // ownership is initial owner again
    expect(await token.owner()).to.eq(owner.address);
    expect(await controller.owner()).to.eq(owner.address);

    expect(await token.balanceOf(locker.address)).to.gte(parseEther("3507745"));

    expect(await token.balanceOf(addresses.MarketingWallet)).to.gte(
      parseEther("398645")
    );

    expect(await token.controller()).to.eq(controller.address);

    const [dgnxPairTJOE, avaxPairTJOE] = await pairTJOE?.getReserves();
    const [dgnxPairPANGO, avaxPairPANGO] = await pairPANGO?.getReserves();

    expect(dgnxPairTJOE).to.lte(parseEther("1250000"));
    expect(dgnxPairPANGO).to.lte(parseEther("1250000"));

    expect(avaxPairTJOE).to.lte(parseEther("1125"));
    expect(avaxPairPANGO).to.lte(parseEther("1125"));
  });

  it("should reclaim funds", async () => {
    const { token, sale } = await contracts();

    const balanceFundsA = await owner.getBalance();
    await sale.finishSale();
    const balanceFundsB = await owner.getBalance();

    const balanceAssetsA = await token.balanceOf(owner.address);
    await token
      .connect(owner)
      .transfer(launcher.address, await token.balanceOf(owner.address));
    expect(await token.balanceOf(owner.address)).to.eq(parseEther("0"));

    await owner.sendTransaction({
      to: launcher.address,
      value: balanceFundsB.sub(balanceFundsA),
    });

    const balanceFundsC = await owner.getBalance();
    await launcher.reclaimAssets();
    const balanceFundsD = await owner.getBalance();
    const balanceAssetsB = await token.balanceOf(owner.address);

    expect(balanceFundsD).to.be.gt(balanceFundsC);
    expect(balanceAssetsA).to.eq(balanceAssetsB);
  });

  it("should reclaim ownership", async () => {
    const { token, controller } = await contracts();
    await token.transferOwnership(launcher.address);
    await controller.transferOwnership(launcher.address);
    expect(await token.owner()).to.eq(launcher.address);
    expect(await controller.owner()).to.eq(launcher.address);
    await launcher.reclaimOwnership();
    expect(await token.owner()).to.eq(owner.address);
    expect(await controller.owner()).to.eq(owner.address);
  });
});
