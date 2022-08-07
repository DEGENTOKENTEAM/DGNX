import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
  await ethers.provider.send("hardhat_mine", ["0xa", "0x15180"]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
