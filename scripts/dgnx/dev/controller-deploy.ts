import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";
const tokenPairAssetAddress = process.env.MAIN_PAIR as unknown as string;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const controller = await (
    await ethers.getContractFactory("DGNXController")
  ).deploy(tokenAddress, tokenPairAssetAddress);
  await controller.deployed();

  const controllerAddress = controller.address;

  console.log("DGNXController deployed to: ", controllerAddress);
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
