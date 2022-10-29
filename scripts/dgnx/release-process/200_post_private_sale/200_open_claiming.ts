import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import { contracts } from "../../../helpers";
dotenv.config();

async function main() {
  const [owner] = await ethers.getSigners();
  const { sale, disburser } = await contracts();

  console.log(
    `Current balance of ${owner.address} with ${ethers.utils.formatEther(
      await owner.getBalance()
    )} AVAX`
  );

  await (await disburser.start()).wait();
  console.log("Disburser claming started");
  console.log(
    `Current balance of ${owner.address} with ${ethers.utils.formatEther(
      await owner.getBalance()
    )} AVAX`
  );

  await (await sale.startClaim()).wait();
  console.log("Private sale claming started");
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
