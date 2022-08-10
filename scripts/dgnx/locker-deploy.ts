import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

const tokenAddress = "0x9F4DFaeF621C0bAA1007B970C66dbea779a6b051";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const locker = await (
    await ethers.getContractFactory("DGNXLocker")
  ).deploy(tokenAddress);
  await locker.deployed();

  const lockerAddress = locker.address;

  console.log("DGNXLocker deployed to: ", lockerAddress);
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
