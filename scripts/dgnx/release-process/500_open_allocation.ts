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
    if (await sale.paused()) {
      await (await sale.pause()).wait();
      console.log("Unpaused sale");
    } else {
      console.log("Unpaused sale already");
    }
    if (await nft.hasMintingStarted()) {
      await (await nft.stopMinting()).wait();
      console.log("Minting stopped");
    } else {
      console.log("Minting already stopped");
    }
    if (await nft.hasMintingSilverStarted()) {
      await (await nft.stopMintingSilver()).wait();
      console.log("Minting SILVER stopped");
    } else {
      console.log("Minting SILVER already stopped");
    }
  } catch (e) {
    console.log("ERROR", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
