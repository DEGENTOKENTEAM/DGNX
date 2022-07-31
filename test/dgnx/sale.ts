import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { tokens } from "./../helpers";
import * as dotenv from "dotenv";
dotenv.config();

describe("Sale", () => {
  let deployer: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    locker: SignerWithAddress;
  let token: Contract, nftContract: Contract, saleContract: Contract;

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: parseInt(process.env.NODE_BLOCK || ""),
        },
      },
    ]);

    [deployer, addr1, addr2, addr3, locker] = await ethers.getSigners();

    token = await (await ethers.getContractFactory("DEGENX")).deploy();
    await token.deployed();

    nftContract = await (
      await ethers.getContractFactory("DGNXPrivateSaleNFT")
    ).deploy("Ticket", "Ticker", "https://dgnx.finance/tickets/", 1, 1, 1);
    await nftContract.deployed();

    saleContract = await (
      await ethers.getContractFactory("DGNXSale")
    ).deploy(token.address, locker.address, nftContract.address);
    await saleContract.deployed();

    await (await token.connect(deployer).enable()).wait();

    await (
      await token
        .connect(deployer)
        .transfer(saleContract.address, tokens(10000000))
    ).wait();
  });

  describe("Admin", () => {
    it("should be paused on deployment", async () => {
      expect(await saleContract.paused()).to.be.true;
    });

    it("should start private sale", async () => {
      expect(await saleContract.paused()).to.be.true;
      await (await saleContract.connect(deployer).unpause()).wait();
      expect(await saleContract.paused()).to.be.false;
    });

    it("should stop private sale", async () => {
      expect(await saleContract.paused()).to.be.true;
      await (await saleContract.connect(deployer).unpause()).wait();
      expect(await saleContract.paused()).to.be.false;
      await (await saleContract.connect(deployer).pause()).wait();
      expect(await saleContract.paused()).to.be.true;
    });

    it("should finish private sale and move funds to owner", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();

      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();

      await (
        await saleContract.connect(deployer).allocateForSale(tokens(1000000))
      ).wait();

      await (
        await nftContract.connect(deployer).airdropMint(addr1.address, 0)
      ).wait();

      await (
        await nftContract.connect(addr1).approve(saleContract.address, 1)
      ).wait();

      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();

      await (
        await addr1.sendTransaction({
          to: saleContract.address,
          value: ethers.utils.parseEther("10"),
        })
      ).wait();

      expect(
        await saleContract.provider.getBalance(saleContract.address)
      ).to.eq(ethers.utils.parseEther("10"));

      await (await saleContract.connect(deployer).finishSale()).wait();

      expect(
        await saleContract.provider.getBalance(saleContract.address)
      ).to.eq(ethers.utils.parseEther("0"));

      expect(await deployer.getBalance()).to.be.gte(
        ethers.BigNumber.from("10008270187400000000000")
      );
    });

    it("should send leftovers to locker", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();

      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();

      await (
        await saleContract.connect(deployer).allocateForSale(tokens(1000000))
      ).wait();

      await (await saleContract.connect(deployer).lockLeftovers()).wait();

      expect(await token.balanceOf(locker.address)).to.eq(tokens(1000000));
    });
  });

  describe("Registration", () => {
    beforeEach(async () => {
      await (await saleContract.connect(deployer).unpause()).wait();
      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();
      await (
        await saleContract.connect(deployer).allocateForSale(tokens(1000000))
      ).wait();
    });

    it("should be able to pay the entrance fee with gold nft", async () => {
      await (await nftContract.connect(deployer).airdropMint(addr1.address, 2)).wait(); // prettier-ignore
      await (await nftContract.connect(addr1).approve(saleContract.address, 1)).wait(); // prettier-ignore
      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();
      expect(await saleContract.privateSaleLimits(addr1.address)).to.eq(tokens(55)); // prettier-ignore
    });

    it("should be able to pay the entrance fee with silver nft", async () => {
      await (await nftContract.connect(deployer).airdropMint(addr1.address, 1)).wait(); // prettier-ignore
      await (await nftContract.connect(addr1).approve(saleContract.address, 1)).wait(); // prettier-ignore
      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();
      expect(await saleContract.privateSaleLimits(addr1.address)).to.eq(tokens(20)); // prettier-ignore
    });

    it("should be able to pay the entrance fee with bronze nft", async () => {
      await (await nftContract.connect(deployer).airdropMint(addr1.address, 0)).wait(); // prettier-ignore
      await (await nftContract.connect(addr1).approve(saleContract.address, 1)).wait(); // prettier-ignore
      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();
      expect(await saleContract.privateSaleLimits(addr1.address)).to.eq(tokens(10)); // prettier-ignore
    });
  });

  describe("Buy", () => {
    it("should fail when sale has not started yet", async () => {
      await expect(
        addr1.sendTransaction({
          to: saleContract.address,
          value: ethers.utils.parseEther("10"),
        })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("should fail when insufficient funds send", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();
      await expect(saleContract.connect(deployer).buy()).to.be.revertedWith(
        "DGNXSale::buy not enough funds sent"
      );
    });

    it("should fail when sale supply exceeded", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();
      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();
      await (
        await saleContract.connect(deployer).allocateForSale(tokens(70000))
      ).wait();
      await (
        await nftContract.connect(deployer).airdropMint(addr1.address, 2)
      ).wait();
      await (
        await nftContract.connect(addr1).approve(saleContract.address, 1)
      ).wait();
      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();
      await expect(
        saleContract.connect(addr1).buy({
          value: ethers.utils.parseEther("55"),
        })
      ).to.be.revertedWith("DGNXSale::buy supply exceeded");
    });

    it("should fail when sender succeeds his buy limit", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();
      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();
      await (
        await saleContract.connect(deployer).allocateForSale(tokens(1000000))
      ).wait();
      await (
        await nftContract.connect(deployer).airdropMint(addr1.address, 0)
      ).wait();
      await (
        await nftContract.connect(addr1).approve(saleContract.address, 1)
      ).wait();
      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();
      await await saleContract.connect(addr1).buy({
        value: ethers.utils.parseEther("55"),
      });

      await expect(
        saleContract.connect(addr1).buy({
          value: ethers.utils.parseEther("55"),
        })
      ).to.be.revertedWith(
        "DGNXSale::buy sale limit exceeded or not registered yet"
      );
    });

    it("should return funds when send to much", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();
      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();
      await (
        await saleContract.connect(deployer).allocateForSale(tokens(1000000))
      ).wait();
      await (
        await nftContract.connect(deployer).airdropMint(addr1.address, 2)
      ).wait();
      await (
        await nftContract.connect(addr1).approve(saleContract.address, 1)
      ).wait();
      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();
      expect(await addr1.getBalance()).to.eq(
        ethers.BigNumber.from("9999961997275000000000")
      );
      await (
        await saleContract.connect(addr1).buy({
          value: ethers.utils.parseEther("1000"),
        })
      ).wait();
      expect(await addr1.getBalance()).to.eq(
        ethers.BigNumber.from("9944947680300000000000")
      );
    });

    it("should send tokens when bought", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();
      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();
      await (
        await saleContract.connect(deployer).allocateForSale(tokens(1000000))
      ).wait();
      await (
        await nftContract.connect(deployer).airdropMint(addr1.address, 0)
      ).wait();
      await (
        await nftContract.connect(deployer).airdropMint(addr2.address, 1)
      ).wait();
      await (
        await nftContract.connect(deployer).airdropMint(addr3.address, 2)
      ).wait();
      await (
        await nftContract.connect(addr1).approve(saleContract.address, 1)
      ).wait();
      await (
        await nftContract.connect(addr2).approve(saleContract.address, 2)
      ).wait();
      await (
        await nftContract.connect(addr3).approve(saleContract.address, 3)
      ).wait();
      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();
      await (await saleContract.connect(addr2).payEntranceFee(2)).wait();
      await (await saleContract.connect(addr3).payEntranceFee(3)).wait();
      await (
        await saleContract.connect(addr1).buy({
          value: ethers.utils.parseEther("100"),
        })
      ).wait();
      await (
        await saleContract.connect(addr2).buy({
          value: ethers.utils.parseEther("100"),
        })
      ).wait();
      await (
        await saleContract.connect(addr3).buy({
          value: ethers.utils.parseEther("100"),
        })
      ).wait();
      expect(await saleContract.bought(addr1.address)).to.eq(
        ethers.BigNumber.from("13333333333333333333333")
      );
      expect(await saleContract.bought(addr2.address)).to.eq(
        ethers.BigNumber.from("26666666666666666666666")
      );
      expect(await saleContract.bought(addr3.address)).to.eq(
        ethers.BigNumber.from("73333333333333333333333")
      );
    });

    it("should check if signer is a participant", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();
      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();
      await (
        await saleContract.connect(deployer).allocateForSale(tokens(1000000))
      ).wait();
      await (
        await nftContract.connect(deployer).airdropMint(addr1.address, 0)
      ).wait();
      await (
        await nftContract.connect(addr1).approve(saleContract.address, 1)
      ).wait();
      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();
      expect(await saleContract.participant(addr1.address)).to.be.true;
    });
  });

  describe("Claiming", () => {
    it("should be allow future holder to claim its allocated assets", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();
      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();
      await (
        await saleContract.connect(deployer).allocateForSale(tokens(1000000))
      ).wait();
      await (
        await nftContract.connect(deployer).airdropMint(addr1.address, 0)
      ).wait();
      await (
        await nftContract.connect(addr1).approve(saleContract.address, 1)
      ).wait();
      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();
      await (
        await saleContract.connect(addr1).buy({
          value: ethers.utils.parseEther("10"),
        })
      ).wait();
      await (await saleContract.connect(deployer).pause()).wait();
      await (await saleContract.connect(deployer).startClaim()).wait();
      await (await saleContract.connect(addr1).claim()).wait();
      expect(await token.balanceOf(addr1.address)).to.eq(
        ethers.BigNumber.from("13333333333333333333333")
      );
    });
    it("should fail when sale is in progress", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();
      await expect(saleContract.claim()).to.be.revertedWith(
        "Pausable: not paused"
      );
    });
    it("should fail when claiming is not active yet", async () => {
      await expect(saleContract.connect(addr1).claim()).to.be.revertedWith(
        "DGNXSale::claim claming not active yet"
      );
    });
    it("should fail when sender has not bought at least 1 asset", async () => {
      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();
      await (
        await saleContract.connect(deployer).allocateForSale(tokens(1000000))
      ).wait();
      await (await saleContract.connect(deployer).startClaim()).wait();
      await expect(saleContract.connect(addr1).claim()).to.be.revertedWith(
        "DGNXSale::claim no funds to claim"
      );
    });
    it("should fail when sender tries to claim multiple times", async () => {
      await (await saleContract.connect(deployer).unpause()).wait();
      await (
        await token
          .connect(deployer)
          .transfer(saleContract.address, tokens(1000000))
      ).wait();
      await (
        await saleContract.connect(deployer).allocateForSale(tokens(1000000))
      ).wait();
      await (
        await nftContract.connect(deployer).airdropMint(addr1.address, 0)
      ).wait();
      await (
        await nftContract.connect(addr1).approve(saleContract.address, 1)
      ).wait();
      await (await saleContract.connect(addr1).payEntranceFee(1)).wait();
      await (
        await saleContract.connect(addr1).buy({
          value: ethers.utils.parseEther("10"),
        })
      ).wait();
      await (await saleContract.connect(deployer).pause()).wait();
      await (await saleContract.connect(deployer).startClaim()).wait();
      await (await saleContract.connect(addr1).claim()).wait();
      await expect(saleContract.connect(addr1).claim()).to.be.revertedWith(
        "DGNXSale::claim no funds to claim"
      );
    });
  });
});
