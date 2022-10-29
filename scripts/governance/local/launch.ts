import * as dotenv from "dotenv";
import { formatEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { contracts } from "../../helpers";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const { token, governor, timelockController, controller, locker } =
    await contracts();
  console.log(
    `Start deployment with balance ${formatEther(await deployer.getBalance())}`
  );

  // grant role to governor contract
  const PROPOSER_ROLE = await timelockController.PROPOSER_ROLE();
  const CANCELLER_ROLE = await timelockController.CANCELLER_ROLE();

  await (
    await timelockController
      .connect(deployer)
      .grantRole(PROPOSER_ROLE, governor.address)
  ).wait();
  await (
    await timelockController
      .connect(deployer)
      .grantRole(CANCELLER_ROLE, governor.address)
  ).wait();

  // console.log(`Move token ownership from ${await token.owner()}`);
  // await (await token.transferOwnership(timelockController.address)).wait(); // prettier-ignore
  // console.log(`to ${await token.owner()}`);
  // console.log(`Move controller ownership from ${await controller.owner()}`);
  // await (await controller.transferOwnership(timelockController.address)).wait(); // prettier-ignore
  // console.log(`to ${await controller.owner()}`);
  // console.log(`Move locker ownership from ${await locker.owner()}`);
  // await (await locker.transferOwnership(timelockController.address)).wait(); // prettier-ignore
  // console.log(`to ${await locker.owner()}`);

  console.log(
    `Finish deployment with balance ${formatEther(await deployer.getBalance())}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
