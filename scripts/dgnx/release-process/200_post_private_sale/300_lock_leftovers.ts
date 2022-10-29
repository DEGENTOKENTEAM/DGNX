import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import { contracts } from "../../../helpers";
dotenv.config();

async function main() {
  const [owner] = await ethers.getSigners();
  const { sale, token, locker } = await contracts();

  console.log(
    `Current balance of ${owner.address} with ${ethers.utils.formatEther(
      await owner.getBalance()
    )} AVAX`
  );

  console.log(
    `Tokens on contract ${sale.address} (before): `,
    ethers.utils.formatUnits(await token.balanceOf(sale.address))
  );
  console.log(
    `Tokens on locker ${locker.address} (before): `,
    ethers.utils.formatUnits(await token.balanceOf(locker.address))
  );

  await (await sale.lockLeftovers()).wait();
  console.log(
    `Tokens on contract ${sale.address} (after): `,
    ethers.utils.formatUnits(await token.balanceOf(sale.address))
  );
  console.log(
    `Tokens on locker ${locker.address} (after): `,
    ethers.utils.formatUnits(await token.balanceOf(locker.address))
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
