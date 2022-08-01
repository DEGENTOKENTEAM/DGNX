import { ethers } from "hardhat";
const abiToken =
  require("../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;
const abiSale =
  require("../../artifacts/contracts/dgnx/DGNXSale.sol/DGNXSale.json").abi;

import * as dotenv from "dotenv";
import { tokens } from "../../test/helpers";
dotenv.config();

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";
const saleAddress = "0x6e56463B6b19110Ed0028A4b5F3De7A07F03d08c";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const sale = new ethers.Contract(saleAddress, abiSale, deployer);
  const token = new ethers.Contract(tokenAddress, abiToken, deployer);

  await (
    await token.connect(deployer).transfer(sale.address, tokens(2000000))
  ).wait();
  console.log(
    `Transferred ${tokens(2000000).toString()} to private sale contract ${
      sale.address
    }`
  );
  console.log("Current balance: ", (await deployer.getBalance()).toString());
  console.log(
    await sale.connect(deployer).estimateGas.allocateForSale(tokens(2000000))
  );

  await (await sale.connect(deployer).allocateForSale(tokens(2000000))).wait();
  console.log(
    `Allocated ${tokens(2000000).toString()} for private sale on contract ${
      sale.address
    }`
  );
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  await (await sale.connect(deployer).unpause()).wait();
  console.log("Unpaused and ready for sale");
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
