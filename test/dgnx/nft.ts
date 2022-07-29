import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("DGNXPrivateSaleNFT", () => {
  const maxSupplyGold = 10;
  const maxSupplySilver = 10;
  const maxSupplyBronze = 10;
  const baseURI = "https://dgnx.finance/assets/nfts/private-sale/";

  enum TicketTypes {
    BRONZE = 0,
    SILVER = 1,
    GOLD = 2,
  }
  let nftContract: Contract,
    deployer: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    addr3: SignerWithAddress,
    admin: SignerWithAddress;

  beforeEach(async () => {
    [deployer, addr1, addr2, addr3, admin] = await ethers.getSigners();
    nftContract = await (
      await ethers.getContractFactory("DGNXPrivateSaleNFT")
    ).deploy(
      "DGNX Private Sale Ticket",
      "PST",
      baseURI,
      maxSupplyGold,
      maxSupplySilver,
      maxSupplyBronze
    );
    await nftContract.deployed();
  });

  describe("Admin", () => {
    it("should be able to withdraw funds", async () => {
      await (await nftContract.connect(deployer).startMintingSilver()).wait();
      const balanceBefore: BigNumber = await deployer.getBalance();
      await (
        await addr1.sendTransaction({
          to: nftContract.address,
          value: ethers.utils.parseEther("2.0"),
        })
      ).wait();

      await (await nftContract.connect(deployer).withdrawFunds()).wait();
      const balanceAfter: BigNumber = await deployer.getBalance();

      expect(balanceAfter.sub(balanceBefore)).to.eq(
        ethers.BigNumber.from("1993136825000000000")
      );
    });
  });

  describe("Whitelist Admin", () => {
    it("add and remove whitelist admin", async () => {
      await (
        await nftContract.connect(deployer).addWhitelistAdmin(admin.address)
      ).wait();
      expect(
        await nftContract.connect(deployer).isWhitelistAdmin(admin.address)
      ).to.be.true;
      await (
        await nftContract.connect(deployer).revokeWhitelistAdmin(admin.address)
      ).wait();
      expect(
        await nftContract.connect(deployer).isWhitelistAdmin(admin.address)
      ).to.be.false;
    });

    it("add and remove claimer to whitelist with NFT Type by pre defined admin", async () => {
      await (
        await nftContract.connect(deployer).addWhitelistAdmin(admin.address)
      ).wait();
      await (
        await nftContract
          .connect(admin)
          .addToWhitelist(addr1.address, TicketTypes.GOLD)
      ).wait();
      await (
        await nftContract
          .connect(admin)
          .addToWhitelist(addr1.address, TicketTypes.BRONZE)
      ).wait();
      await expect(
        nftContract
          .connect(admin)
          .addToWhitelist(addr1.address, TicketTypes.SILVER)
      ).to.be.revertedWith(
        "DGNXPrivateSaleNFT::addToWhitelist not valid ticket type"
      );
      expect(await nftContract.connect(admin).isWhitelisted(addr1.address)).to
        .be.true;
      await (
        await nftContract.connect(admin).revokeFromWhitelist(addr1.address)
      ).wait();
      expect(await nftContract.connect(admin).isWhitelisted(addr1.address)).to
        .be.false;
    });

    it("can start Gold NFT mint", async () => {
      await expect(nftContract.connect(deployer).startMintingGold()).to.emit(
        nftContract,
        "StartMintingGold"
      );

      expect(await nftContract.hasMintingGoldStarted()).to.be.true;
    });

    it("can stop Gold NFT mint", async () => {
      await expect(nftContract.connect(deployer).stopMintingGold()).to.emit(
        nftContract,
        "StopMintingGold"
      );
      expect(await nftContract.hasMintingGoldStarted()).to.be.false;
    });

    it("can start Silver NFT mint", async () => {
      await expect(nftContract.connect(deployer).startMintingSilver()).to.emit(
        nftContract,
        "StartMintingSilver"
      );
      expect(await nftContract.hasMintingSilverStarted()).to.be.true;
    });

    it("can stop Silver NFT mint", async () => {
      await expect(nftContract.connect(deployer).stopMintingSilver()).to.emit(
        nftContract,
        "StopMintingSilver"
      );
      expect(await nftContract.hasMintingSilverStarted()).to.be.false;
    });

    it("can start Bronze NFT mint", async () => {
      await expect(nftContract.connect(deployer).startMintingBronze()).to.emit(
        nftContract,
        "StartMintingBronze"
      );
      expect(await nftContract.hasMintingBronzeStarted()).to.be.true;
    });

    it("can stop Bronze NFT mint", async () => {
      await expect(nftContract.connect(deployer).stopMintingBronze()).to.emit(
        nftContract,
        "StopMintingBronze"
      );
      expect(await nftContract.hasMintingBronzeStarted()).to.be.false;
    });
  });

  describe("Selling", () => {
    describe("Gold NFTs", () => {
      beforeEach(async () => {
        await (await nftContract.connect(deployer).startMinting()).wait();
        await (await nftContract.connect(deployer).startMintingGold()).wait();
      });

      it("should be minting Gold NFT after whitelisting", async () => {
        await (
          await nftContract
            .connect(deployer)
            .addToWhitelist(addr1.address, TicketTypes.GOLD)
        ).wait();

        await (
          await nftContract
            .connect(addr1)
            .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
        ).wait();

        expect(await nftContract.balanceOf(addr1.address)).to.eq(1);
        expect(await nftContract.lookupTicketType(1)).to.eq(TicketTypes.GOLD);
      });

      it("should fail if address is not whitelisted", async () => {
        await expect(
          nftContract
            .connect(addr1)
            .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
        ).to.be.revertedWith(
          "DGNXPrivateSaleNFT::mintWhitelist not allowed to mint ticket"
        );
      });

      it("should fail if another mint is requested by the same address", async () => {
        await (
          await nftContract
            .connect(deployer)
            .addToWhitelist(addr1.address, TicketTypes.GOLD)
        ).wait();

        await (
          await nftContract
            .connect(addr1)
            .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
        ).wait();

        await expect(
          nftContract
            .connect(addr1)
            .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
        ).to.be.revertedWith(
          "DGNXPrivateSaleNFT::mintWhitelist Exceeds maximum amount per ticket per wallet"
        );
      });

      it("should fail if insufficient amount of value is received", async () => {
        await (
          await nftContract
            .connect(deployer)
            .addToWhitelist(addr1.address, TicketTypes.GOLD)
        ).wait();
        await expect(
          nftContract
            .connect(addr1)
            .mintWhitelist({ value: ethers.utils.parseEther("1.0") })
        ).to.be.revertedWith(
          "DGNXPrivateSaleNFT::mintWhitelist Insufficient payment"
        );
      });

      it("should fail if max supply is reached", async () => {
        const tmpAccounts = (await ethers.getSigners()).slice(10, 21);
        for (let i = 0; i < maxSupplyGold + 1; i++) {
          const tmpWallet = tmpAccounts[i];
          await (
            await nftContract
              .connect(deployer)
              .addToWhitelist(tmpWallet.address, TicketTypes.GOLD)
          ).wait();

          if (i < maxSupplyGold) {
            await (
              await nftContract
                .connect(tmpWallet)
                .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
            ).wait();
          } else {
            await expect(
              nftContract
                .connect(tmpWallet)
                .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
            ).to.be.revertedWith(
              "DGNXPrivateSaleNFT::mintWhitelist Exceeds max supply allowed for ticket"
            );
          }
        }
      });
    });

    describe("Bronze NFTs", () => {
      beforeEach(async () => {
        await (await nftContract.connect(deployer).startMinting()).wait();
        await (await nftContract.connect(deployer).startMintingBronze()).wait();
      });

      it("should be minting Bronze NFT after whitelisting", async () => {
        await (
          await nftContract
            .connect(deployer)
            .addToWhitelist(addr1.address, TicketTypes.BRONZE)
        ).wait();

        await (
          await nftContract
            .connect(addr1)
            .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
        ).wait();

        expect(await nftContract.balanceOf(addr1.address)).to.eq(1);
        expect(await nftContract.lookupTicketType(1)).to.eq(TicketTypes.BRONZE);
      });

      it("should fail if address is not whitelisted", async () => {
        await expect(
          nftContract
            .connect(addr1)
            .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
        ).to.be.revertedWith(
          "DGNXPrivateSaleNFT::mintWhitelist not allowed to mint ticket"
        );
      });

      it("should fail if another mint is requested by the same address", async () => {
        await (
          await nftContract
            .connect(deployer)
            .addToWhitelist(addr1.address, TicketTypes.BRONZE)
        ).wait();

        await (
          await nftContract
            .connect(addr1)
            .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
        ).wait();

        await expect(
          nftContract
            .connect(addr1)
            .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
        ).to.be.revertedWith(
          "DGNXPrivateSaleNFT::mintWhitelist Exceeds maximum amount per ticket per wallet"
        );
      });

      it("should fail if insufficient amount of value is received", async () => {
        await (
          await nftContract
            .connect(deployer)
            .addToWhitelist(addr1.address, TicketTypes.BRONZE)
        ).wait();
        await expect(
          nftContract
            .connect(addr1)
            .mintWhitelist({ value: ethers.utils.parseEther("1.0") })
        ).to.be.revertedWith(
          "DGNXPrivateSaleNFT::mintWhitelist Insufficient payment"
        );
      });

      it("should fail if max supply is reached", async () => {
        const tmpAccounts = (await ethers.getSigners()).slice(10, 21);
        for (let i = 0; i < maxSupplyBronze + 1; i++) {
          const tmpWallet = tmpAccounts[i];
          await (
            await nftContract
              .connect(deployer)
              .addToWhitelist(tmpWallet.address, TicketTypes.BRONZE)
          ).wait();

          if (i < maxSupplyBronze) {
            await (
              await nftContract
                .connect(tmpWallet)
                .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
            ).wait();
          } else {
            await expect(
              nftContract
                .connect(tmpWallet)
                .mintWhitelist({ value: ethers.utils.parseEther("2.0") })
            ).to.be.revertedWith(
              "DGNXPrivateSaleNFT::mintWhitelist Exceeds max supply allowed for ticket"
            );
          }
        }
      });
    });

    describe("Silver NFT", () => {
      beforeEach(async () => {
        await (await nftContract.connect(deployer).startMinting()).wait();
        await (await nftContract.connect(deployer).startMintingSilver()).wait();
      });

      it("should be minting Silver NFT", async () => {
        await (
          await nftContract
            .connect(addr1)
            .mint({ value: ethers.utils.parseEther("2.0") })
        ).wait();

        expect(await nftContract.balanceOf(addr1.address)).to.eq(1);
        expect(await nftContract.lookupTicketType(1)).to.eq(TicketTypes.SILVER);
      });

      it("should be able to mint only 1 NFT for address", async () => {
        await (
          await nftContract
            .connect(addr1)
            .mint({ value: ethers.utils.parseEther("2.0") })
        ).wait();

        expect(await nftContract.balanceOf(addr1.address)).to.eq(1);
        expect(await nftContract.lookupTicketType(1)).to.eq(TicketTypes.SILVER);

        await expect(
          nftContract
            .connect(addr1)
            .mint({ value: ethers.utils.parseEther("2.0") })
        ).to.revertedWith(
          "DGNXPrivateSaleNFT::mint Exceeds maximum amount per ticket per wallet"
        );
      });

      it("should fail when address is already on any whitelist", async () => {
        await (
          await nftContract
            .connect(deployer)
            .addToWhitelist(addr1.address, TicketTypes.GOLD)
        ).wait();

        await expect(
          nftContract
            .connect(addr1)
            .mint({ value: ethers.utils.parseEther("2.0") })
        ).to.revertedWith(
          "DGNXPrivateSaleNFT::mint not allowed to mint ticket"
        );
      });

      it("should fail if insufficient amount of value is received", async () => {
        await expect(
          nftContract
            .connect(addr1)
            .mint({ value: ethers.utils.parseEther("1.0") })
        ).to.revertedWith("DGNXPrivateSaleNFT::mint Insufficient payment");
      });

      it("should fail if max supply is reached", async () => {
        const tmpAccounts = (await ethers.getSigners()).slice(10, 21);
        for (let i = 0; i < maxSupplySilver + 1; i++) {
          const tmpWallet = tmpAccounts[i];
          if (i < maxSupplySilver) {
            await (
              await nftContract
                .connect(tmpWallet)
                .mint({ value: ethers.utils.parseEther("2.0") })
            ).wait();
          } else {
            await expect(
              nftContract
                .connect(tmpWallet)
                .mint({ value: ethers.utils.parseEther("2.0") })
            ).to.be.revertedWith(
              "DGNXPrivateSaleNFT::mint Exceeds max supply allowed for ticket"
            );
          }
        }
      });
    });

    describe("Airdrop NFT", () => {
      it("should be able to mint Gold NFT", async () => {
        await (
          await nftContract
            .connect(deployer)
            .airdropMint(addr1.address, TicketTypes.GOLD)
        ).wait();
        expect(await nftContract.balanceOf(addr1.address)).to.eq(1);
        expect(await nftContract.lookupTicketType(1)).to.eq(TicketTypes.GOLD);
      });

      it("should be able to mint Silver NFT", async () => {
        await (
          await nftContract
            .connect(deployer)
            .airdropMint(addr1.address, TicketTypes.SILVER)
        ).wait();
        expect(await nftContract.balanceOf(addr1.address)).to.eq(1);
        expect(await nftContract.lookupTicketType(1)).to.eq(TicketTypes.SILVER);
      });

      it("should be able to mint Bronze NFT", async () => {
        await (
          await nftContract
            .connect(deployer)
            .airdropMint(addr1.address, TicketTypes.BRONZE)
        ).wait();
        expect(await nftContract.balanceOf(addr1.address)).to.eq(1);
        expect(await nftContract.lookupTicketType(1)).to.eq(TicketTypes.BRONZE);
      });

      it("should be able to mint only 1 NFT for address", async () => {
        await (
          await nftContract
            .connect(deployer)
            .airdropMint(addr1.address, TicketTypes.GOLD)
        ).wait();
        await expect(
          nftContract
            .connect(deployer)
            .airdropMint(addr1.address, TicketTypes.GOLD)
        ).to.be.revertedWith(
          "DGNXPrivateSaleNFT::airdropMint Exceeds maximum amount per ticket per wallet"
        );
      });

      it("should fail if max supply is reached", async () => {
        const tmpAccounts = (await ethers.getSigners()).slice(10, 21);
        for (let i = 0; i < maxSupplyBronze + 1; i++) {
          const tmpWallet = tmpAccounts[i];

          if (i < maxSupplyBronze) {
            await (
              await nftContract
                .connect(deployer)
                .airdropMint(tmpWallet.address, TicketTypes.BRONZE)
            ).wait();
          } else {
            await expect(
              nftContract
                .connect(deployer)
                .airdropMint(tmpWallet.address, TicketTypes.BRONZE)
            ).to.be.revertedWith(
              "DGNXPrivateSaleNFT::airdropMint Exceeds max supply allowed"
            );
          }
        }
      });
    });
  });

  describe("Burning", () => {
    it("should be able to burn", async () => {
      await (await nftContract.connect(deployer).startMinting()).wait();
      await (await nftContract.connect(deployer).startMintingSilver()).wait();
      await (
        await nftContract
          .connect(addr1)
          .mint({ value: ethers.utils.parseEther("2.0") })
      ).wait();
      expect(await nftContract.balanceOf(addr1.address)).to.eq(1);
      await (await nftContract.connect(addr1).burn(1)).wait();
      expect(await nftContract.balanceOf(addr1.address)).to.eq(0);
    });
  });

  describe("General", () => {
    it("should start minting", async () => {
      await expect(nftContract.connect(deployer).startMinting()).to.emit(
        nftContract,
        "StartMinting"
      );
    });
    it("should have function to receive nft url", async () => {
      await (await nftContract.connect(deployer).startMinting()).wait();
      await (
        await nftContract
          .connect(deployer)
          .airdropMint(addr1.address, TicketTypes.BRONZE)
      ).wait();
      await (
        await nftContract
          .connect(deployer)
          .airdropMint(addr2.address, TicketTypes.SILVER)
      ).wait();
      await (
        await nftContract
          .connect(deployer)
          .airdropMint(addr3.address, TicketTypes.GOLD)
      ).wait();
      expect(await nftContract.tokenURI(1)).to.be.equal(`${baseURI}bronze.jpg`);
      expect(await nftContract.tokenURI(2)).to.be.equal(`${baseURI}silver.jpg`);
      expect(await nftContract.tokenURI(3)).to.be.equal(`${baseURI}gold.jpg`);
    });
  });
});
