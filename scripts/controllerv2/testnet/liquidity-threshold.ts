import * as dotenv from "dotenv";
import { Contract } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";

const controllerAbi =
  require("./../../../artifacts/contracts/dgnx/DGNXControllerV2.sol/DGNXControllerV2.json").abi;

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();

  const controller = new Contract(
    "0x3f4775aC72641864A18821bcC364f19B706F8373",
    controllerAbi,
    deployer
  );
  await (await controller.setLiquidityThreshold(parseEther("1"))).wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
