import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { contracts } from "../helpers";
dotenv.config();

async function main() {
  const [owner] = await ethers.getSigners();
  const { nft, sale } = await contracts();
  console.log(
    `Current balance of ${owner.address} with ${ethers.utils.formatEther(
      await owner.getBalance()
    )} AVAX`
  );
  try {
    console.log(
      `Funds on contract ${nft.address} (before): `,
      ethers.utils.formatUnits(await ethers.provider.getBalance(nft.address))
    );
    console.log(
      `Funds on owner wallet ${owner.address} (before): `,
      ethers.utils.formatUnits(await owner.getBalance())
    );
    await (await nft.withdrawFunds()).wait();
    console.log(
      `Funds on contract ${nft.address} (after): `,
      ethers.utils.formatUnits(await ethers.provider.getBalance(nft.address))
    );
    console.log(
      `Funds on owner wallet ${owner.address} (after): `,
      ethers.utils.formatUnits(await owner.getBalance())
    );
  } catch (e) {
    console.log("ERROR", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
