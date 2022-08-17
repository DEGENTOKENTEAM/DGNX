import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

const tokenAddress = "0xA78384C229A8Ae30DC7D72BB2216d4391ec98758";
const lockerAddress = "0x1C2180aFEC864b3b35115F9A062e16753fc0E87C";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const claimInterval = 60 * 60 * 24 * 30; // 30 days
  const tardyHolderTimeframe = 60 * 60 * 24 * 30 * 3; // 90 days

  const disburser = await (
    await ethers.getContractFactory("DGNXLegacyDisburser")
  ).deploy(
    tokenAddress,
    lockerAddress,
    claimInterval,
    tardyHolderTimeframe,
    10,
    5
  );
  await disburser.deployed();

  console.log("DGNXLegacyDisburser deployed to: ", disburser.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
