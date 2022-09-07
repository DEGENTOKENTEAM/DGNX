import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const token = await (await ethers.getContractFactory("DEGENX")).deploy();
  await token.deployed();

  const tokenAddress = token.address;

  console.log("DGNX Token deployed to: ", tokenAddress);
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
