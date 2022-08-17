import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

const tokenAddress = "0xA78384C229A8Ae30DC7D72BB2216d4391ec98758";

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
