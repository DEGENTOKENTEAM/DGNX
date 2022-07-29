import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const abiToken =
  require("./../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const token = new ethers.Contract(tokenAddress, abiToken, deployer);

  await (await token.connect(deployer).enable()).wait();
  console.log(`Token ${token.address} is now enabled`);
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
