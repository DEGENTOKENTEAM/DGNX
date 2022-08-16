import { ethers } from "hardhat";
const abiDisburser =
  require("../../artifacts/contracts/dgnx/DGNXLegacyDisburser.sol/DGNXLegacyDisburser.json").abi;
const abiToken =
  require("../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;

import * as dotenv from "dotenv";
import { BigNumber } from "ethers";
dotenv.config();

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";
const disburserAddress = "0x55643aB1809cC48BB0A768E71c564CF8639fbd41";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const token = new ethers.Contract(tokenAddress, abiToken, deployer);
  const disburser = new ethers.Contract(
    disburserAddress,
    abiDisburser,
    deployer
  );

  const addresses: string[] = [
    "0x095D6cBCFb46cd23f0d129376F3dC7fe76aDA359",
    "0x1A8900516C7D3254C291644E238C81949906CE32",
    "0x0403f8F288bCCEF33a8B860a6BA87820f83535a7",
    "0xA54DCb30bD172E0E0Fb6Ad81A91BD0B1957c76E2",
    "0x86AA299C1045B3C841cBa4f2F70302e7D8A60221",
    "0x90b77a9d0A012D2CB0C4d3888E49bc53d005bF07",
    "0xf013574Bbc5f3f578B7b7eC79F30Cd8C283d8Fd7",
    "0x2D28AA94edD503c529292Ae65821b504a43c9D15",
  ];

  const amounts: BigNumber[] = [
    ethers.BigNumber.from("100000000000000000000000"),
    ethers.BigNumber.from("20000000000000000000000"),
    ethers.BigNumber.from("150000000000000000000000"),
    ethers.BigNumber.from("10000000000000000000000"),
    ethers.BigNumber.from("5005000000000000000000"),
    ethers.BigNumber.from("100000000000000000000"),
    ethers.BigNumber.from("1234000000000000000000"),
    ethers.BigNumber.from("22222000000000000000000"),
  ];

  await (
    await disburser.connect(deployer).addAddresses(addresses, amounts)
  ).wait();

  console.log(`Added addresses to Disburser ${disburser.address}`);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  await (
    await token.connect(deployer).transfer(disburser.address, ethers.BigNumber.from("420000000000000000000000"))
  ).wait();

  console.log(`Transferred tokens to ${token.address}`);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  await (await disburser.connect(deployer).start()).wait();

  console.log(`Started Disburser`);
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
