import * as dotenv from "dotenv";
import { formatUnits, parseEther } from "ethers/lib/utils";
import * as fs from "fs";
import { ethers, network } from "hardhat";

import { addresses, contracts } from "../helpers";

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
