import { ethers } from "hardhat";
const abiNft =
  require("../../artifacts/contracts/dgnx/DGNXPrivateSaleNFT.sol/DGNXPrivateSaleNFT.json").abi;
import * as dotenv from "dotenv";
dotenv.config();

const nftContractAddress = "0xe7037Ff9CA70C66D92EfB7921188471B731126c3";
const walletToType: { wallet: string; type: number }[] = [
  {
    wallet: "0x095D6cBCFb46cd23f0d129376F3dC7fe76aDA359",
    type: 2,
  },
  // {
  //   wallet: "0x1A8900516C7D3254C291644E238C81949906CE32",
  //   type: 1,
  // },
  {
    wallet: "0x0403f8F288bCCEF33a8B860a6BA87820f83535a7",
    type: 0,
  },
  {
    wallet: "0xA54DCb30bD172E0E0Fb6Ad81A91BD0B1957c76E2",
    type: 2,
  },
  // {
  //   wallet: "0x86AA299C1045B3C841cBa4f2F70302e7D8A60221",
  //   type: 1,
  // },
  {
    wallet: "0x90b77a9d0A012D2CB0C4d3888E49bc53d005bF07",
    type: 0,
  },
  // {
  //   wallet: "0xf013574Bbc5f3f578B7b7eC79F30Cd8C283d8Fd7",
  //   type: 1,
  // },
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
    const { wallet, type } = walletToType[i];
    await (
      await nftContract.connect(deployer).addToWhitelist(wallet, type)
    ).wait();
    console.log(
      `Added wallet ${wallet} with NFT type ${type} to the whitelist`
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
