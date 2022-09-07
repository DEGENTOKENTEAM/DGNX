import { ethers } from "hardhat";
const abiFactory = require("../helpers/abi-factory.json");
const abiController =
  require("../../artifacts/contracts/dgnx/DGNXController.sol/DGNXController.json").abi;
const abiToken =
  require("../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;

import * as dotenv from "dotenv";
dotenv.config();

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";
const controllerAddress = "0x4CBb84b6f845DFAA26caaBc3cCD6C55187bFE163";
const tokenPairAssetAddress = process.env.MAIN_PAIR as unknown as string;
const dexAFactoryAddress = process.env.DEX_A_FACTORY as unknown as string;
const dexBFactoryAddress = process.env.DEX_B_FACTORY as unknown as string;
let dexAPairAddress: string;
let dexBPairAddress: string;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const token = new ethers.Contract(tokenAddress, abiToken, deployer);
  const controller = new ethers.Contract(
    controllerAddress,
    abiController,
    deployer
  );
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

  dexAPairAddress = await dexAFactory
    .connect(deployer)
    .getPair(token.address, tokenPairAssetAddress);
  dexBPairAddress = await dexBFactory
    .connect(deployer)
    .getPair(token.address, tokenPairAssetAddress);

  await (
    await controller.connect(deployer).addFactory(dexAFactory.address)
  ).wait();
  console.log(`Added factory ${dexAFactory.address} to controller`);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  await (
    await controller.connect(deployer).addPair(dexAPairAddress, [])
  ).wait();
  console.log(`Added pair ${dexAPairAddress} to controller`);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  await (
    await controller.connect(deployer).addFactory(dexBFactory.address)
  ).wait();
  console.log(`Added factory ${dexBFactory.address} to controller`);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  await (
    await controller.connect(deployer).addPair(dexBPairAddress, [])
  ).wait();
  console.log(`Added pair ${dexBPairAddress} to controller`);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  await (
    await controller.connect(deployer).setMainPair(dexBPairAddress)
  ).wait();
  console.log(`Set main pair so ${dexBPairAddress} to controller`);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  await (
    await token.connect(deployer).updateController(controller.address)
  ).wait();
  console.log(
    `Controller ${controller.address} is now connected to token ${token.address}`
  );
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
