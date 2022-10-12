import * as dotenv from "dotenv";
import { Contract } from "ethers";
import { ethers } from "hardhat";

const abiToken =
  require("../../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();

  const controllerAddress = "0x223B26cC3d0154Ee9B625e94Eb194940a8Ca3867";
  const tokenAddress = "0x51e48670098173025C477D9AA3f0efF7BF9f7812";
  console.log(`Start deployment with balance ${await deployer.getBalance()}`);

  const token = new Contract(tokenAddress, abiToken, deployer);

  const tx = await token.updateController(controllerAddress);
  console.log(`Updated controller`, await tx.wait());

  console.log(await token.controller());

  console.log(`Finish deployment with balance ${await deployer.getBalance()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
