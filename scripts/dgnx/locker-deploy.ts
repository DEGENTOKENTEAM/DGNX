import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";

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
