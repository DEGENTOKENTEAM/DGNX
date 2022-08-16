import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

const abiToken =
  require("../../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;
const abiLocker =
  require("../../../artifacts/contracts/dgnx/DGNXLocker.sol/DGNXLocker.json").abi;
const abiNFT =
  require("../../../artifacts/contracts/dgnx/DGNXPrivateSaleNFT.sol/DGNXPrivateSaleNFT.json").abi;
const abiSale =
  require("../../../artifacts/contracts/dgnx/DGNXSale.sol/DGNXSale.json").abi;
const abiDisburser =
  require("../../../artifacts/contracts/dgnx/DGNXLegacyDisburser.sol/DGNXLegacyDisburser.json").abi;

const addressToken = "0x9F4DFaeF621C0bAA1007B970C66dbea779a6b051";
const addressLocker = "0x3B4196CD81C8564e1Fbb28bdD401D27cF9200f2a";
const addressNFT = "0xc744ca7919cE10c2893F067c79DA252AB89A006b";
const addressSale = "0xD97520d00e2445c4b7115EeF892647944BB1A1eF";
const addressDisburser = "0x55643aB1809cC48BB0A768E71c564CF8639fbd41";

export const contracts = async () => {
  const [owner] = await ethers.getSigners();
  return {
    token: new ethers.Contract(addressToken, abiToken, owner),
    locker: new ethers.Contract(addressLocker, abiLocker, owner),
    nft: new ethers.Contract(addressNFT, abiNFT, owner),
    sale: new ethers.Contract(addressSale, abiSale, owner),
    disburser: new ethers.Contract(addressDisburser, abiDisburser, owner),
  };
};
