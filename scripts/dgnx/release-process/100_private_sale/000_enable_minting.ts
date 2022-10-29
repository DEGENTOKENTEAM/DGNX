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
    if (!(await nft.hasMintingStarted())) {
      await (await nft.startMinting()).wait();
      console.log("Minting started");
    } else {
      console.log("Minting already started");
    }
  } catch (e) {
    console.log("ERROR", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
