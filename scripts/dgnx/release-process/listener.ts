import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import { contracts } from "../helpers";
dotenv.config();

async function main() {
  const { token } = await contracts();
  token.on("Transfer", console.log);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
