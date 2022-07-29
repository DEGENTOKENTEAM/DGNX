import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";
const lockerAddress = "0x93EBA5D903a3f8AB6eFAd762Db423F6Eb94FbBbC";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const disburser = await (
    await ethers.getContractFactory("DGNXLegacyDisburser")
  ).deploy(tokenAddress, lockerAddress, 60, 10, 5);
  await disburser.deployed();

  console.log("DGNXLegacyDisburser deployed to: ", disburser.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
