import * as dotenv from "dotenv";
import { formatUnits, parseEther } from "ethers/lib/utils";
import * as fs from "fs";
import { ethers, network } from "hardhat";

import { addresses, contracts } from "../../helpers";

dotenv.config();

async function main() {
  const [owner] = await ethers.getSigners();
  const {
    sale,
    token,
    locker,
    launcher,
    nft,
    controller,
    factoryTJOE,
    factoryPANGO,
    pairTJOE,
    pairPANGO,
  } = await contracts();
  console.log(
    `Current balance of ${owner.address}: ${ethers.utils.formatUnits(
      await owner.getBalance()
    )}`
  );

  await (await controller.allowContract('0x16eF18E42A7d72E52E9B213D7eABA269B90A4643')).wait()
  await (await controller.allowContract('0x31CE1540414361cFf99e83a05e4ad6d35D425202')).wait()
  await (await controller.allowContract('0xcA01A9d36F47561F03226B6b697B14B9274b1B10')).wait()
  await (await controller.allowContract('0x829619513F202e1bFD8929f656EF96bac73BDAe8')).wait()

  console.log(
    `Current balance of ${owner.address}: ${ethers.utils.formatUnits(
      await owner.getBalance()
    )}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
