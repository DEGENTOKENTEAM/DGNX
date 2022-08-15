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
    if (!(await sale.paused())) {
      await (await sale.pause()).wait();
      console.log("Paused sale");
    } else {
      console.log("Paused sale already");
    }
    if (!(await nft.hasMintingStarted())) {
      await (await nft.startMinting()).wait();
      console.log("Minting started");
    } else {
      console.log("Minting already started");
    }
    if (await nft.hasMintingGoldStarted()) {
      await (await nft.stopMintingGold()).wait();
      console.log("Minting GOLD stopped");
    } else {
      console.log("Minting GOLD already stopped");
    }
    if (!(await nft.hasMintingBronzeStarted())) {
      await (await nft.startMintingBronze()).wait();
      console.log("Minting BRONZE started");
    } else {
      console.log("Minting BRONZE already started");
    }
  } catch (e) {
    console.log("ERROR", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
