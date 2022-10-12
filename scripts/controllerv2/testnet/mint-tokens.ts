import * as dotenv from "dotenv";
import { Contract } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";

const wavaxAddress = "0xA3D10042C4d421c756B1e35afF968D50550DF3Ad";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const wavax = new Contract(
    wavaxAddress,
    [
      "function mint(address to, uint256 amount) external",
      "function balanceOf(address account) external view returns (uint256)",
    ],
    deployer
  );
  const wavaxWallets = [""];
  for (let i = 0; i < wavaxWallets.length; i++) {
    await (await wavax.mint(wavaxWallets[i], parseEther("100"))).wait();
    console.log(
      `Balance of ${wavaxWallets[i]}: ${formatEther(
        await wavax.balanceOf(wavaxWallets[i])
      )}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
