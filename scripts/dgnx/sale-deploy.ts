import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const tokenAddress = "0x9F4DFaeF621C0bAA1007B970C66dbea779a6b051";
const lockerAddress = "0x3B4196CD81C8564e1Fbb28bdD401D27cF9200f2a";
const nftAddress = "0xc744ca7919cE10c2893F067c79DA252AB89A006b";

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
