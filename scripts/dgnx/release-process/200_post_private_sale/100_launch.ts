import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import { contracts } from "../../helpers";
dotenv.config();

async function main() {
  const [owner] = await ethers.getSigners();
  const { controller } = await contracts();

  console.log(
    `Current balance of ${owner.address} with ${ethers.utils.formatEther(
      await owner.getBalance()
    )} AVAX`
  );

  await (await controller.disableBotProtection()).wait();
  console.log("Removed bot protection");
  console.log(
    `Current balance of ${owner.address} with ${ethers.utils.formatEther(
      await owner.getBalance()
    )} AVAX`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
