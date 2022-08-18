import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { ethers } from "hardhat";
import { tokens } from "../helpers";

import * as dotenv from "dotenv";
dotenv.config();

describe("Token", () => {
  let owner: SignerWithAddress, notOwner: SignerWithAddress;
  let locker: Contract, token: Contract;

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: parseInt(process.env.NODE_BLOCK || ""),
        },
      },
    ]);

    [owner, notOwner] = await ethers.getSigners();

    token = await (await ethers.getContractFactory("DEGENX")).deploy();
    await token.deployed();

    locker = await (
      await ethers.getContractFactory("DGNXLocker")
    ).deploy(token.address);
    await locker.deployed();
  });

  it("has correct balance after transfer", async () => {
    expect(await locker.assetBalance()).to.eq(tokens(0));
    await (await token.transfer(locker.address, tokens(100))).wait();
    expect(await locker.assetBalance()).to.eq(tokens(0));
    await (await locker.sync()).wait();
    expect(await locker.assetBalance()).to.eq(tokens(100));
  });

  it("only owner is able to withdraw assets", async () => {
    await (await token.transfer(locker.address, tokens(100))).wait();
    await (await locker.sync()).wait();
    await (
      await locker.withdraw(
        notOwner.address,
        tokens(10),
        ethers.BigNumber.from("1")
      )
    ).wait();
    expect(await token.balanceOf(notOwner.address)).to.eq(tokens(10));
  });
  
  it("fails when balance is not enough", async () => {
    await expect(
      locker.withdraw(notOwner.address, tokens(10), ethers.BigNumber.from("1"))
    ).to.be.revertedWith("DGNXLocker::withdraw insufficient balance");
  });
});
