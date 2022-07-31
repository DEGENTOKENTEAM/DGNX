import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network } from "hardhat";
import { tokens } from "./../helpers";
import * as dotenv from "dotenv";
dotenv.config();

describe("Legacy Disburser", () => {
  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    addr4: SignerWithAddress;
  let token: Contract, disburser: Contract, locker: Contract;

  const prepareAddresses = async () => {
    const addr1Balance = ethers.BigNumber.from("100000000000000000000000");
    const addr2Balance = ethers.BigNumber.from("200000000000000000000000");
    const addr3Balance = ethers.BigNumber.from("150000000000000000000000");
    await (
      await disburser
        .connect(owner)
        .addAddresses(
          [addr1.address, addr2.address, addr3.address],
          [addr1Balance, addr2Balance, addr3Balance]
        )
    ).wait();

    expect(await disburser.amountLeft(addr1.address)).to.eq(addr1Balance);
    expect(await disburser.amountLeft(addr2.address)).to.eq(addr2Balance);
    expect(await disburser.amountLeft(addr3.address)).to.eq(addr3Balance);
  };

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: parseInt(process.env.NODE_BLOCK || ""),
        },
      },
    ]);

    [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    token = await (await ethers.getContractFactory("DEGENX")).deploy();
    await token.deployed();

    await (await token.connect(owner).enable()).wait();

    locker = await (
      await ethers.getContractFactory("DGNXLocker")
    ).deploy(token.address);
    await locker.deployed();

    disburser = await (
      await ethers.getContractFactory("DGNXLegacyDisburser")
    ).deploy(token.address, locker.address, 60, 180, 10, 5);
    await disburser.deployed();
  });

  describe("Deployment", () => {
    it("should be not started after deployment", async () => {
      expect(await disburser.connect(owner).isStarted()).to.eq(false);
    });
    it("should be started", async () => {
      await (await disburser.connect(owner).start()).wait();
      expect(await disburser.connect(owner).isStarted()).to.eq(true);
    });
  });

  describe("Units", () => {
    beforeEach(async () => {
      await (await disburser.connect(owner).start()).wait();
    });

    it("can add addresses", async () => {
      await prepareAddresses();
    });

    it("can transfer tokens to a specific", async () => {
      await (
        await token.connect(owner).transfer(disburser.address, tokens(1))
      ).wait();
      await (
        await disburser.connect(owner).transferTokensTo(addr3.address)
      ).wait();
      expect(await token.balanceOf(addr3.address)).to.eq(tokens(1));
    });

    it("check if has amout left", async () => {
      await prepareAddresses();
      expect(await disburser.hasAmountLeft(addr1.address)).to.be.true;
    });

    it("check if has not started claming yet", async () => {
      await prepareAddresses();
      expect(await disburser.hasStartedClaiming(addr1.address)).to.be.false;
    });

    it("respond metrics", async () => {
      await (
        await token.connect(owner).transfer(disburser.address, tokens(10000000))
      ).wait();
      await prepareAddresses();
      await (await disburser.connect(addr1).claimStart()).wait();
      await (await disburser.connect(addr2).claimStart()).wait();
      const data = await disburser.data();
      expect(data.claimableAmount).to.eq(
        ethers.BigNumber.from("450000000000000000000000")
      );
      expect(data.paidOutAmount).to.eq(
        ethers.BigNumber.from("30000000000000000000000")
      );
      expect(data.totalPayouts).to.eq(ethers.BigNumber.from("0"));
      expect(data.recentClaim).to.eq(ethers.BigNumber.from("1657362280"));
    });
  });

  describe("Claiming", () => {
    let claimable;
    let missedPayouts;
    let lastClaim;

    beforeEach(async () => {
      await (await disburser.connect(owner).start()).wait();
      await (
        await token.connect(owner).transfer(disburser.address, tokens(10000000))
      ).wait();
      await prepareAddresses();
    });

    it("should check if claiming has started", async () => {
      expect(await disburser.hasStartedClaiming(addr1.address)).to.be.false;
    });

    it("should check if has any amount left", async () => {
      expect(await disburser.hasAmountLeft(addr1.address)).to.be.true;
    });

    it("should fail when claiming without initial amout claimed", async () => {
      await expect(disburser.connect(addr1).claim()).to.be.revertedWith(
        "DGNXLegacyDisburser::claimStart missing initial claim"
      );
    });

    it("should be able to make initial claim", async () => {
      expect(await disburser.connect(addr1).claimStart())
        .to.emit(disburser, "StartClaim")
        .withArgs(process.env.NODE_BLOCK, addr1.address, tokens(10000));
      expect(await token.balanceOf(addr1.address)).to.eq(tokens(10000));
    });

    it("should fail when initial claim is already made", async () => {
      await (await disburser.connect(addr1).claimStart()).wait();
      await expect(disburser.connect(addr1).claimStart()).to.be.revertedWith(
        "DGNXLegacyDisburser::claimStart already claimed initial funds"
      );
    });

    it("should estimate claimable amount after claim start with 0", async () => {
      await (await disburser.connect(addr1).claimStart()).wait();
      ({ claimable, missedPayouts, lastClaim } = await disburser
        .connect(addr1)
        .claimEstimate());
      expect(claimable).to.eq(ethers.BigNumber.from("0"));
      expect(missedPayouts).to.eq(ethers.BigNumber.from("0"));
      expect(lastClaim).to.be.false;
    });

    it("should estimate claimable amount after first interval", async () => {
      await (await disburser.connect(addr1).claimStart()).wait();
      expect(await token.balanceOf(addr1.address)).to.eq(
        ethers.BigNumber.from("10000000000000000000000")
      );

      ({ claimable, missedPayouts, lastClaim } = await disburser
        .connect(addr1)
        .claimEstimate());
      expect(claimable).to.eq(ethers.BigNumber.from("0"));
      expect(missedPayouts).to.eq(ethers.BigNumber.from("0"));
      expect(lastClaim).to.be.false;

      await network.provider.send("hardhat_mine", ["0x3C", "0x1"]);
      ({ claimable, missedPayouts, lastClaim } = await disburser
        .connect(addr1)
        .claimEstimate());
      expect(claimable).to.eq(ethers.BigNumber.from("500000000000000000000"));
      expect(missedPayouts).to.eq(ethers.BigNumber.from("1"));
      expect(lastClaim).to.be.false;
    });

    it("should estimate claimable amount after fifth interval", async () => {
      await (await disburser.connect(addr1).claimStart()).wait();
      await network.provider.send("hardhat_mine", ["0x12C", "0x1"]);
      ({ claimable } = await disburser.connect(addr1).claimEstimate());
      expect(claimable).to.eq(ethers.BigNumber.from("2762815625000000000000"));
    });

    it("should estimate claimable max possible amount by exceeding interval with claming before", async () => {
      await (await disburser.connect(addr1).claimStart()).wait();
      await network.provider.send("hardhat_mine", ["0xB40", "0x1"]);
      ({ claimable, missedPayouts, lastClaim } = await disburser
        .connect(addr1)
        .claimEstimate());
      expect(claimable).to.eq(ethers.BigNumber.from("22250999437136998254359"));
      expect(missedPayouts).to.eq(ethers.BigNumber.from("24"));
      expect(lastClaim).to.be.true;
    });

    it("should claim successful after first interval", async () => {
      await (await disburser.connect(addr1).claimStart()).wait();
      await network.provider.send("hardhat_mine", ["0x3C", "0x1"]);
      expect(await disburser.connect(addr1).claim())
        .to.emit(disburser, "Claim")
        .withArgs(
          parseInt(process.env.NODE_BLOCK || "") + 100,
          addr1.address,
          ethers.BigNumber.from("500000000000000000000")
        );

      expect(await token.balanceOf(addr1.address)).to.eq(
        ethers.BigNumber.from("10500000000000000000000")
      );
    });

    it("should claim successful after 20th interval", async () => {
      await (await disburser.connect(addr1).claimStart()).wait();

      for (let i = 0; i < 20; i++) {
        await network.provider.send("hardhat_mine", ["0x3C", "0x1"]);
        if (i % 2) {
          await (await disburser.connect(addr1).claim()).wait();
        }
      }

      expect(await token.balanceOf(addr1.address)).to.eq(
        ethers.BigNumber.from("26532977051444201339450")
      );
    });

    it("should claim from 10th interval up to 20th on each interval", async () => {
      await (await disburser.connect(addr1).claimStart()).wait();

      await network.provider.send("hardhat_mine", ["0x258", "0x1"]);
      await (await disburser.connect(addr1).claim()).wait();

      for (let i = 0; i < 10; i++) {
        await network.provider.send("hardhat_mine", ["0x3C", "0x1"]);
        await (await disburser.connect(addr1).claim()).wait();
      }

      expect(await token.balanceOf(addr1.address)).to.eq(
        ethers.BigNumber.from("26532977051444201339450")
      );
    });

    it("should claim each month and on the 24th months rest of tokens is sent to locker", async () => {
      await (await disburser.connect(addr1).claimStart()).wait();

      for (let i = 0; i < 24; i++) {
        await network.provider.send("hardhat_mine", ["0x3C", "0x1"]);
        await (await disburser.connect(addr1).claim()).wait();
      }

      const payedOutAmount: BigNumber = await token.balanceOf(addr1.address);
      const lockerAmount: BigNumber = await token.balanceOf(locker.address);
      expect(payedOutAmount).to.eq(
        ethers.BigNumber.from("32250999437136998254359")
      );
      expect(lockerAmount).to.eq(
        ethers.BigNumber.from("417749000562863001745641")
      );
    });

    it("should claim first and next claim after 24th months rest of tokens is sent to locker", async () => {
      await (await disburser.connect(addr1).claimStart()).wait();
      await network.provider.send("hardhat_mine", ["0x2", "0x5A1"]);
      await (await disburser.connect(addr1).claim()).wait();
      const payedOutAmount: BigNumber = await token.balanceOf(addr1.address);
      const lockerAmount: BigNumber = await token.balanceOf(locker.address);
      expect(payedOutAmount).to.eq(
        ethers.BigNumber.from("32250999437136998254359")
      );
      expect(lockerAmount).to.eq(
        ethers.BigNumber.from("267749000562863001745641")
      );
    });

    it("should remove one tardy holder when the limit of time is reached", async () => {
      await prepareAddresses();
      await (await disburser.connect(addr1).claimStart()).wait();
      expect(await disburser.amountLeft(addr2.address)).to.eq(
        ethers.BigNumber.from("200000000000000000000000")
      );
      expect(await disburser.amountLeft(addr3.address)).to.eq(
        ethers.BigNumber.from("150000000000000000000000")
      );
      await network.provider.send("hardhat_mine", ["0x2", "0xB5"]);
      await (await disburser.connect(addr1).claim()).wait();
      expect(await disburser.amountLeft(addr2.address)).to.eq(
        ethers.BigNumber.from("0")
      );
      expect(await disburser.amountLeft(addr3.address)).to.eq(
        ethers.BigNumber.from("150000000000000000000000")
      );
      await network.provider.send("hardhat_mine", ["0x2", "0xB5"]);
      await (await disburser.connect(addr1).claim()).wait();
      expect(await disburser.amountLeft(addr2.address)).to.eq(
        ethers.BigNumber.from("0")
      );
      expect(await disburser.amountLeft(addr3.address)).to.eq(
        ethers.BigNumber.from("0")
      );
      expect(await token.balanceOf(locker.address)).to.eq(
        ethers.BigNumber.from("350000000000000000000000")
      );
    });

    it("should not be able to start claming when 3 intervals are over", async () => {
      await prepareAddresses();
      await (await disburser.connect(addr1).claimStart()).wait();
      await network.provider.send("hardhat_mine", ["0x2", "0xB5"]);
      await expect(disburser.connect(addr2).claimStart()).to.be.revertedWith(
        "DGNXLegacyDisburser::claimStart first claming period is over"
      );
    });
  });
});
