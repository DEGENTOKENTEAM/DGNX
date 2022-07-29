import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const nftContract = await (
    await ethers.getContractFactory("DGNXPrivateSaleNFT")
  ).deploy(
    "DGNX Private Sale Token",
    "PST",
    "https://dgnx.finance/assets/nfts/private-sale/",
    3,
    3,
    3
  );
  await nftContract.deployed();

  console.log("DGNXPrivateSaleNFT deployed to: ", nftContract.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  await (await nftContract.connect(deployer).startMinting()).wait();

  console.log("Started minting");
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
