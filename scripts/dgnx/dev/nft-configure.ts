import { ethers } from "hardhat";
const abiNft =
  require("../../artifacts/contracts/dgnx/DGNXPrivateSaleNFT.sol/DGNXPrivateSaleNFT.json").abi;
import * as dotenv from "dotenv";
dotenv.config();

const nftContractAddress = "0xc744ca7919cE10c2893F067c79DA252AB89A006b";
const walletToType: { wallet: string; type: number }[] = [
  {
    wallet: "0x095D6cBCFb46cd23f0d129376F3dC7fe76aDA359",
    type: 2,
  },
  {
    wallet: "0x0403f8F288bCCEF33a8B860a6BA87820f83535a7",
    type: 0,
  },
  {
    wallet: "0xA54DCb30bD172E0E0Fb6Ad81A91BD0B1957c76E2",
    type: 2,
  },
  {
    wallet: "0x90b77a9d0A012D2CB0C4d3888E49bc53d005bF07",
    type: 0,
  },
  {
    wallet: "0x2D28AA94edD503c529292Ae65821b504a43c9D15",
    type: 2,
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Current balance: ", (await deployer.getBalance()).toString());

  const nftContract = new ethers.Contract(nftContractAddress, abiNft, deployer);
  for (let i = 0; i < walletToType.length; i++) {
    const { wallet: address, type } = walletToType[i];
    await (
      await nftContract.connect(deployer).addToWhitelist(address, type)
    ).wait();
    console.log(
      `Added wallet ${address} with NFT type ${type} to the whitelist`
    );
    console.log("Current balance: ", (await deployer.getBalance()).toString());
  }

  console.log("Finished adding wallet");
  console.log("Current balance: ", (await deployer.getBalance()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
