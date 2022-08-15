import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { contracts } from "../helpers";
dotenv.config();

async function main() {
  const [owner] = await ethers.getSigners();
  const { nft, sale, token } = await contracts();
  console.log(
    `Current balance of ${owner.address} with ${ethers.utils.formatEther(
      await owner.getBalance()
    )} AVAX`
  );

  try {
    if (await nft.hasMintingStarted()) {
      await (await nft.stopMinting()).wait();
      console.log("Minting stopped");
    } else {
      console.log("Minting already stopped");
    }
    if (await nft.hasMintingSilverStarted()) {
      await (await nft.stopMintingSilver()).wait();
      console.log("Minting SILVER stopped");
    } else {
      console.log("Minting SILVER already stopped");
    }

    console.log(
      `Tokens on contract ${sale.address} (before): `,
      ethers.utils.formatUnits(await token.balanceOf(sale.address))
    );
    console.log(
      `Tokens on owner wallet ${owner.address} (before): `,
      ethers.utils.formatUnits(await token.balanceOf(owner.address))
    );
    await (await sale.lockLeftovers()).wait();
    console.log(
      `Tokens on contract ${sale.address} (after): `,
      ethers.utils.formatUnits(await token.balanceOf(sale.address))
    );
    console.log(
      `Tokens on owner wallet ${owner.address} (after): `,
      ethers.utils.formatUnits(await token.balanceOf(owner.address))
    );

    console.log(
      `Funds on contract ${sale.address} (before): `,
      ethers.utils.formatUnits(await ethers.provider.getBalance(sale.address))
    );
    console.log(
      `Funds on owner wallet ${owner.address} (before): `,
      ethers.utils.formatUnits(await owner.getBalance())
    );
    await (await sale.finishSale()).wait();
    console.log(
      `Funds on contract ${sale.address} (after): `,
      ethers.utils.formatUnits(await ethers.provider.getBalance(sale.address))
    );
    console.log(
      `Funds on owner wallet ${owner.address} (before): `,
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
