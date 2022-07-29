import { ethers } from "hardhat";
const abiFactory = require("./../helpers/abi-factory.json");

import * as dotenv from "dotenv";
import { ContractReceipt } from "ethers";
dotenv.config();

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";
const tokenPairAssetAddress = process.env.MAIN_PAIR as unknown as string;
const dexAFactoryAddress = process.env.DEX_A_FACTORY as unknown as string;
const dexBFactoryAddress = process.env.DEX_B_FACTORY as unknown as string;

const abiCoder = new ethers.utils.AbiCoder();

async function main() {
  let pairAddress: string;
  let dexAFactoryTxReceipt: ContractReceipt;
  let dexBFactoryTxReceipt: ContractReceipt;
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const dexAFactory = new ethers.Contract(
    dexAFactoryAddress,
    abiFactory,
    deployer
  );
  const dexBFactory = new ethers.Contract(
    dexBFactoryAddress,
    abiFactory,
    deployer
  );

  dexAFactoryTxReceipt = await (
    await dexAFactory
      .connect(deployer)
      .createPair(tokenAddress, tokenPairAssetAddress)
  ).wait();
  [pairAddress] = abiCoder.decode(
    ["address"],
    dexAFactoryTxReceipt.events![0].data,
    false
  );
  console.log(
    `Pair created on ${pairAddress} (Factory: ${dexAFactoryAddress})`
  );
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  dexBFactoryTxReceipt = await (
    await dexBFactory
      .connect(deployer)
      .createPair(tokenAddress, tokenPairAssetAddress)
  ).wait();
  [pairAddress] = abiCoder.decode(
    ["address"],
    dexBFactoryTxReceipt.events![0].data,
    false
  );
  console.log(
    `Pair created on ${pairAddress} (Factory: ${dexBFactoryAddress})`
  );
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
