import { ethers } from "hardhat";
import * as dotenv from "dotenv";
const abiToken =
  require("../../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;
const tokenAddress = "0xA78384C229A8Ae30DC7D72BB2216d4391ec98758";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();

  // const token = new ethers.Contract(tokenAddress, abiToken, deployer);

  // console.log(await token.balanceOf(deployer.address));
  // console.log(
  //   await token.balanceOf("0x0403f8F288bCCEF33a8B860a6BA87820f83535a7")
  // );
  // await (
  //   await token.transfer(
  //     "0x0403f8F288bCCEF33a8B860a6BA87820f83535a7",
  //     ethers.utils.parseUnits("15000")
  //   )
  // ).wait();
  // console.log(await token.balanceOf(deployer.address));
  // console.log(
  //   await token.balanceOf("0x0403f8F288bCCEF33a8B860a6BA87820f83535a7")
  // );

  console.log(
    "block before",
    await ethers.provider.getBlockNumber(),
    (await ethers.provider.getBlock(await ethers.provider.getBlockNumber()))
      .timestamp
  );
  await ethers.provider.send("hardhat_mine", [
    ethers.utils.hexStripZeros(ethers.utils.hexlify(2)),
    ethers.utils.hexStripZeros(ethers.utils.hexlify(8640000)),
  ]);
  console.log(
    "block after",
    await ethers.provider.getBlockNumber(),
    (await ethers.provider.getBlock(await ethers.provider.getBlockNumber()))
      .timestamp
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
