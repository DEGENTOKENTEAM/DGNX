import { ethers } from "hardhat";
const abiSale =
  require("../../artifacts/contracts/dgnx/DGNXSale.sol/DGNXSale.json").abi;

import * as dotenv from "dotenv";
dotenv.config();

const saleAddress = "0xaB5509180dAb096eAdD406D8f7F3337Bd4767d86";
const ownerAddress = "0xA54DCb30bD172E0E0Fb6Ad81A91BD0B1957c76E2"; 

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const saleCcontract = new ethers.Contract(saleAddress, abiSale, deployer);

  await (
    await saleCcontract.connect(deployer).transferOwnership(ownerAddress)
  ).wait();

  console.log(`Sale ownership set to ${ownerAddress} by ${deployer.address}`);
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
