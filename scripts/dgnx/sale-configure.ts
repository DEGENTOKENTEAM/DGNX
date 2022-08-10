import { ethers } from "hardhat";
const abiToken =
  require("../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;
const abiSale =
  require("../../artifacts/contracts/dgnx/DGNXSale.sol/DGNXSale.json").abi;

import * as dotenv from "dotenv";
import { tokens } from "../../test/helpers";
dotenv.config();

const tokenAddress = "0x9F4DFaeF621C0bAA1007B970C66dbea779a6b051";
const saleAddress = "0xD97520d00e2445c4b7115EeF892647944BB1A1eF";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const sale = new ethers.Contract(saleAddress, abiSale, deployer);
  const token = new ethers.Contract(tokenAddress, abiToken, deployer);

  await (
    await token.connect(deployer).transfer(sale.address, tokens(1133334))
  ).wait();
  console.log(
    `Transferred ${tokens(1133334).toString()} to private sale contract ${
      sale.address
    }`
  );
  console.log("Current balance: ", (await deployer.getBalance()).toString());
  console.log(
    await sale.connect(deployer).estimateGas.allocateForSale(tokens(1133334))
  );

  await (await sale.connect(deployer).allocateForSale(tokens(1133334))).wait();
  console.log(
    `Allocated ${tokens(1133334).toString()} for private sale on contract ${
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
