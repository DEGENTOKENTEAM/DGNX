import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";
const lockerAddress = "0x93EBA5D903a3f8AB6eFAd762Db423F6Eb94FbBbC";
const nftAddress = "0xE5C7eA944e890773893C32714eA8b5E3Ab5680cA";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const sales = await (
    await ethers.getContractFactory("DGNXSale")
  ).deploy(tokenAddress, lockerAddress, nftAddress);
  await sales.deployed();

  console.log("DGNXSale deployed to: ", sales.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});