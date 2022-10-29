import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { contracts } from "../../../helpers";
dotenv.config();

async function main() {
  const [owner] = await ethers.getSigners();
  const { nft } = await contracts();
  console.log(
    `Current balance of ${owner.address} with ${ethers.utils.formatEther(
      await owner.getBalance()
    )} AVAX`
  );

  try {
    if (await nft.hasMintingSilverStarted()) {
      await (await nft.stopMintingSilver()).wait();
      console.log("Minting SILVER stopped");
    }
    if (await nft.hasMintingBronzeStarted()) {
      await (await nft.stopMintingBronze()).wait();
      console.log("Minting BRONZE stopped");
    }
    if (await nft.hasMintingGoldStarted()) {
      await (await nft.stopMintingGold()).wait();
      console.log("Minting GOLD stopped");
    }

    await (await nft.startMintingSilver()).wait();
    console.log("Minting SILVER started");
  } catch (e) {
    console.log("ERROR", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
