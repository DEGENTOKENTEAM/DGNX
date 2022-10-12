import * as dotenv from "dotenv";
import { Contract } from "ethers";
import { formatUnits, parseEther } from "ethers/lib/utils";
import * as fs from "fs";
import { ethers, network } from "hardhat";

const abiToken =
  require("../../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;
const abiWavax = require("../../dgnx/release-process/abi-wavax.json");

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();

  const factoryTJOEAddress = "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10";
  const factoryPANGOAddress = "0xefa94DE7a4656D787667C749f7E1223D71E9FD88";
  const pairTJOEAddress = "0xbcaBb94006400eD84c3699728d6ecbAa06665c89";
  const pairPANGOAddress = "0x4a8323A220D554C03733612D415d465B3f21F12e";
  const tokenAddress = "0x51e48670098173025C477D9AA3f0efF7BF9f7812";
  const wavaxAddress = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";

  if (network.name === "localfork") {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: parseInt(process.env.NODE_BLOCK || ""),
        },
      },
    ]);
    await network.provider.send("hardhat_setBalance", [
      deployer.address,
      "0x487A9A304539440000",
    ]);
  }
  console.log(`Start deployment with balance ${await deployer.getBalance()}`);

  const token = new Contract(tokenAddress, abiToken, deployer);
  const wavax = new Contract(wavaxAddress, abiWavax, deployer);

  const controller = await (
    await ethers.getContractFactory("DGNXControllerV2")
  ).deploy(
    token.address,
    wavax.address,
    [factoryTJOEAddress, factoryPANGOAddress],
    [pairTJOEAddress, pairPANGOAddress],
    pairTJOEAddress
  );
  console.log(`Controller address ${controller.address}`);

  await (
    await controller.allowContract("0x16eF18E42A7d72E52E9B213D7eABA269B90A4643")
  ).wait();
  await (
    await controller.allowContract("0x31CE1540414361cFf99e83a05e4ad6d35D425202")
  ).wait();
  await (
    await controller.allowContract("0xcA01A9d36F47561F03226B6b697B14B9274b1B10")
  ).wait();
  await (
    await controller.allowContract("0x829619513F202e1bFD8929f656EF96bac73BDAe8")
  ).wait();
  console.log(`Added wallets to whitelist`);

  console.log(`Finish deployment with balance ${await deployer.getBalance()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
