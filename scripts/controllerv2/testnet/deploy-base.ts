import * as dotenv from "dotenv";
import { Contract } from "ethers";
import { formatUnits, parseEther } from "ethers/lib/utils";
import * as fs from "fs";
import { ethers, network } from "hardhat";

const abiFactory = require("./abi-factory.json");
const abiPair = require("./abi-pair.json");
const abiRouter = require("./abi-router.json");

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();

  let factoryTJOEAddress = "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10";
  let routerTJOEAddress = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
  let factoryPANGOAddress = "0xefa94DE7a4656D787667C749f7E1223D71E9FD88";
  let routerPANGOAddress = "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106";
  if (network.config.chainId === 43113) {
    factoryTJOEAddress = "0xF5c7d9733e5f53abCC1695820c4818C59B457C2C";
    routerTJOEAddress = "0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901";
    factoryPANGOAddress = "0x2a496ec9e9bE22e66C61d4Eb9d316beaEE31A77b";
    routerPANGOAddress = "0x688d21b0B8Dc35971AF58cFF1F7Bf65639937860";
  }

  if (network.name === "localfork") {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: 19703426,
        },
      },
    ]);
    await network.provider.send("hardhat_setBalance", [
      deployer.address,
      "0x487A9A304539440000",
    ]);
  }

  console.log(`Start deployment with balance ${await deployer.getBalance()}`);

  const token = await (
    await ethers.getContractFactory("DEGENXtestnet")
  ).deploy();
  console.log(`Token address ${token.address}`);

  const wavax = await (
    await ethers.getContractFactory("ERC20_Token_Sample")
  ).deploy("Wrapped AVAX", "WAVAX");
  console.log(`WAVAX address ${wavax.address}`);

  const factoryTJOE = new Contract(factoryTJOEAddress, abiFactory, deployer);
  const factoryPANGO = new Contract(factoryPANGOAddress, abiFactory, deployer);
  const routerTJOE = new Contract(routerTJOEAddress, abiRouter, deployer);
  const routerPANGO = new Contract(routerPANGOAddress, abiRouter, deployer);

  await (await token.approve(routerTJOE.address, parseEther("1000"))).wait();
  await (await token.approve(routerPANGO.address, parseEther("1000"))).wait();
  await (await wavax.approve(routerTJOE.address, parseEther("10"))).wait();
  await (await wavax.approve(routerPANGO.address, parseEther("10"))).wait();

  await (
    await routerTJOE.addLiquidity(
      token.address,
      wavax.address,
      parseEther("1000"),
      parseEther("10"),
      parseEther("0"),
      parseEther("0"),
      deployer.address,
      2000000000
    )
  ).wait();
  const pairAddyTJOE = await factoryTJOE.getPair(token.address, wavax.address);
  console.log(`TJOE pair address ${pairAddyTJOE}`);

  await (
    await routerPANGO.addLiquidity(
      token.address,
      wavax.address,
      parseEther("1000"),
      parseEther("10"),
      parseEther("0"),
      parseEther("0"),
      deployer.address,
      2000000000
    )
  ).wait();
  const pairAddyPANGO = await factoryPANGO.getPair(
    token.address,
    wavax.address
  );
  console.log(`PANGO pair address ${pairAddyPANGO}`);

  const controller = await (
    await ethers.getContractFactory("DGNXControllerV2")
  ).deploy(
    token.address,
    wavax.address,
    [factoryTJOE.address, factoryPANGO.address],
    [pairAddyTJOE, pairAddyPANGO],
    pairAddyTJOE
  );
  console.log(`Controller address ${controller.address}`);

  await (await token.updateController(controller.address)).wait();
  console.log(`Controller updated on token`);

  console.log(`Finish deployment with balance ${await deployer.getBalance()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
