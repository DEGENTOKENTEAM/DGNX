import * as dotenv from "dotenv";
import { Contract } from "ethers";
import { formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { contracts } from "../../helpers";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const { token } = await contracts();
  console.log(
    `Start deployment with balance ${formatEther(
      await deployer.getBalance()
    )} on ${deployer.address}`
  );

  const minDelayTimelock = 60 * 60 * 24 * 1;

  const timelockController: Contract = await (
    await ethers.getContractFactory("DGNXTimelockController")
  ).deploy(minDelayTimelock, [], [ethers.constants.AddressZero]);
  await timelockController.deployed();
  console.log(`Deployed TimelockControl to ${timelockController.address}`);

  const governor: Contract = await (
    await ethers.getContractFactory("DGNXGovernor")
  ).deploy(token.address, timelockController.address);
  await governor.deployed();
  console.log(`Deployed Governor to ${governor.address}`);

  console.log(
    `Finish deployment with balance ${formatEther(
      await deployer.getBalance()
    )} on ${deployer.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
