import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";
const lockerAddress = "0x3B4196CD81C8564e1Fbb28bdD401D27cF9200f2a";

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
