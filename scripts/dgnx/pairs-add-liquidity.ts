import { ethers } from "hardhat";
const abiFactory = require("../helpers/abi-factory.json");
const abiPair = require("../helpers/abi-pair.json");
const abiErc20 = require("../helpers/abi-erc20.json");
const abiToken =
  require("./../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;

import * as dotenv from "dotenv";
import { Contract } from "ethers";
dotenv.config();

const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";
const tokenPairAssetAddress = process.env.MAIN_PAIR as unknown as string;
const dexAFactoryAddress = process.env.DEX_A_FACTORY as unknown as string;
const dexBFactoryAddress = process.env.DEX_B_FACTORY as unknown as string;

// for main net, this needs to be edited
const tokenLiquidity = ethers.BigNumber.from("1000000000000000000000000");
const tokenPairLiquidity = ethers.BigNumber.from("1000000000000000000000");

async function main() {
  let pair: Contract;
  let pairAddress: string;
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

  const token = new ethers.Contract(tokenAddress, abiToken, deployer);
  const tokenPairAsset = new ethers.Contract(
    tokenPairAssetAddress,
    abiErc20,
    deployer
  );

  pairAddress = await dexAFactory
    .connect(deployer)
    .getPair(tokenAddress, tokenPairAssetAddress);

  await (
    await token.connect(deployer).transfer(pairAddress, tokenLiquidity)
  ).wait();
  await (
    await tokenPairAsset
      .connect(deployer)
      .transfer(pairAddress, tokenPairLiquidity)
  ).wait();

  pair = new ethers.Contract(pairAddress, abiPair, deployer);
  await (await pair.connect(deployer).mint(deployer.address)).wait();
  console.log(
    `Added liquidity to pair ${pairAddress} (Factory: ${dexAFactory.address})`
  );
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  pairAddress = await dexBFactory
    .connect(deployer)
    .getPair(tokenAddress, tokenPairAssetAddress);

  await (
    await token.connect(deployer).transfer(pairAddress, tokenLiquidity)
  ).wait();
  await (
    await tokenPairAsset
      .connect(deployer)
      .transfer(pairAddress, tokenPairLiquidity)
  ).wait();

  pair = new ethers.Contract(pairAddress, abiPair, deployer);
  await (await pair.connect(deployer).mint(deployer.address)).wait();
  console.log(
    `Added liquidity to pair ${pairAddress} (Factory: ${dexBFactory.address})`
  );
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
