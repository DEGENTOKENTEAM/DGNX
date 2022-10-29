import { ethers } from "hardhat";

import * as dotenv from "dotenv";
dotenv.config();

const abiToken =
  require("./../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json").abi;
const abiLocker =
  require("./../../artifacts/contracts/dgnx/DGNXLocker.sol/DGNXLocker.json").abi;
const abiNFT =
  require("./../../artifacts/contracts/dgnx/DGNXPrivateSaleNFT.sol/DGNXPrivateSaleNFT.json").abi;
const abiSale =
  require("./../../artifacts/contracts/dgnx/DGNXSale.sol/DGNXSale.json").abi;
const abiDisburser =
  require("./../../artifacts/contracts/dgnx/DGNXLegacyDisburser.sol/DGNXLegacyDisburser.json").abi;
const abiController =
  require("./../../artifacts/contracts/dgnx/DGNXControllerV2.sol/DGNXControllerV2.json").abi;
const abiLauncher =
  require("./../../artifacts/contracts/dgnx/DGNXLauncher.sol/DGNXLauncher.json").abi;
const abiTimelockController =
  require("./../../artifacts/contracts/dgnx-governance/DGNXTimelockControl.sol/DGNXTimelockController.json").abi;
const abiGovernor =
  require("./../../artifacts/contracts/dgnx-governance/DGNXGovernor.sol/DGNXGovernor.json").abi;

const abiFactoryTJOE = require("./abi-tjoe-factory.json");
const abiRouterTJOE = require("./abi-tjoe-router.json");
const abiFactoryPANGO = require("./abi-pango-factory.json");
const abiRouterPANGO = require("./abi-pango-router.json");
const abiWavax = require("./abi-wavax.json");

const addressToken = "0x51e48670098173025C477D9AA3f0efF7BF9f7812";
const addressLocker = "0x2c7D8bB6aBA4FFf56cDDBF9ea47ed270A10098F7";
const addressNFT = "0xe87bFC5Ffc5510B7D56e8Dc246217aFa964C01dF";
const addressSale = "0xA9015a356e8B1EC0d16E4073A20D7F0BA53fcc43";
const addressDisburser = "0x8a0E3264Da08bf999AfF5a50AabF5d2dc89fab79";
const addressController = "0x223b26cc3d0154ee9b625e94eb194940a8ca3867";
const addressLauncher = "0xEde887D3E36f17fA8A21b644Ec1cf0CEA2AF8C95";

const addressPairTJOE = "0xbcaBb94006400eD84c3699728d6ecbAa06665c89";
const addressPairPANGO = "0x4a8323A220D554C03733612D415d465B3f21F12e";

const addressTimelockController = "0xC07017739f09778ccea0468dA7b8381f1967Eb95";
const addressGovernor = "0xbdA8dcEB22b0e06Ad612f339C41539Ea2ddCCEf8";

/// Mainnet
const addressRouterTJOE = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const addressFactoryTJOE = "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10";
const addressRouterPANGO = "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106";
const addressFactoryPANGO = "0xefa94DE7a4656D787667C749f7E1223D71E9FD88";

/// Mainnet
const MarketingWallet = "0x16eF18E42A7d72E52E9B213D7eABA269B90A4643";

export const contracts = async () => {
  const [owner] = await ethers.getSigners();
  return {
    token: new ethers.Contract(addressToken, abiToken, owner),
    wavax: new ethers.Contract(addresses.WAVAX, abiWavax, owner),
    locker: new ethers.Contract(addressLocker, abiLocker, owner),
    nft: new ethers.Contract(addressNFT, abiNFT, owner),
    sale: new ethers.Contract(addressSale, abiSale, owner),
    disburser: new ethers.Contract(addressDisburser, abiDisburser, owner),
    controller: new ethers.Contract(addressController, abiController, owner),
    timelockController: new ethers.Contract(
      addressTimelockController,
      abiTimelockController,
      owner
    ),
    governor: new ethers.Contract(addressGovernor, abiGovernor, owner),
    launcher: new ethers.Contract(addressLauncher, abiLauncher, owner),
    routerTJOE: new ethers.Contract(addressRouterTJOE, abiRouterTJOE, owner),
    routerPANGO: new ethers.Contract(addressRouterPANGO, abiRouterPANGO, owner),
    factoryTJOE: new ethers.Contract(addressFactoryTJOE, abiFactoryTJOE, owner),
    factoryPANGO: new ethers.Contract(
      addressFactoryPANGO,
      abiFactoryPANGO,
      owner
    ),
    pairTJOE: new ethers.Contract(addressPairTJOE, abis.abiPairTJOE, owner),
    pairPANGO: new ethers.Contract(addressPairPANGO, abis.abiPairPANGO, owner),
  };
};

export const abis = {
  abiPairTJOE: require("./abi-tjoe-pair.json"),
  abiPairPANGO: require("./abi-pango-pair.json"),
};

export const addresses = {
  /// Mainnet
  WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
  MarketingWallet,
};
