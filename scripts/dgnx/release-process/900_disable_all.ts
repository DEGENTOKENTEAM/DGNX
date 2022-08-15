import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { contracts } from "../helpers";
dotenv.config();

async function main() {
  const [owner] = await ethers.getSigners();
  const { nft, sale } = await contracts();
  console.log(
    `Current balance of ${owner.address} with ${ethers.utils.formatEther(
      await owner.getBalance()
    )} AVAX`
  );

  try {
    // NFT
    if (await nft.hasMintingStarted()) {
      await (await nft.stopMinting()).wait();
      console.log("Minting stopped");
    } else {
      console.log("Minting stopped already");
    }
    if (await nft.hasMintingGoldStarted()) {
      await (await nft.stopMintingGold()).wait();
      console.log("Minting GOLD stopped");
    } else {
      console.log("Minting GOLD stopped already");
    }
    if (await nft.hasMintingSilverStarted()) {
      await (await nft.stopMintingSilver()).wait();
      console.log("Minting SILVER stopped");
    } else {
      console.log("Minting SILVER stopped already");
    }
    if (await nft.hasMintingBronzeStarted()) {
      await (await nft.stopMintingBronze()).wait();
      console.log("Minting BRONZE stopped");
    } else {
      console.log("Minting BRONZE stopped already");
    }
    if (await nft.hasMintingBronzeStarted()) {
      await (await nft.stopMintingBronze()).wait();
      console.log("Minting BRONZE stopped");
    } else {
      console.log("Minting BRONZE stopped already");
    }

    // SALE
    if (!(await sale.paused())) {
      await (await sale.pause()).wait();
      console.log("Paused sale");
    } else {
      console.log("Paused sale already");
    }
    if (await sale.claimActive()) {
      await (await sale.stopClaim()).wait();
      console.log("Claiming stopped");
    } else {
      console.log("Claiming stopped already");
    }
  } catch (e) {
    console.log("ERROR", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
