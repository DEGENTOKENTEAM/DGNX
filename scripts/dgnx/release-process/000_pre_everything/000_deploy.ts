import * as dotenv from "dotenv";
import { formatUnits, parseEther } from "ethers/lib/utils";
import * as fs from "fs";
import { ethers } from "hardhat";

import { addresses } from "../../../helpers";

dotenv.config();

async function main() {
  const tokenDistribution = {
    sale: parseEther("3333334"),
    disburser: parseEther("11260276"),
    marketing: parseEther("398645"),
  };
  const [deployer] = await ethers.getSigners();

  const legacyHoldersJSON = JSON.parse(
    fs.readFileSync(`${__dirname}/../../legacy-holders/holders.json`).toString()
  );

  const whitelistingsJSON = JSON.parse(
    fs.readFileSync(`${__dirname}/../../whitelisting/wallets.json`).toString()
  );

  console.log(`Deploying contracts with the account ${deployer.address}`);
  console.log(
    `Current balance: ${ethers.utils.formatUnits(await deployer.getBalance())}`
  );

  //
  // deploy token
  //
  const token = await (await ethers.getContractFactory("DEGENX")).deploy();
  await token.deployed();

  console.log(`Token address: ${token.address}`);
  console.log(
    `Current balance: ${ethers.utils.formatUnits(await deployer.getBalance())}`
  );

  //
  // deploy controller
  //
  const controller = await (
    await ethers.getContractFactory("DGNXController")
  ).deploy(token.address, addresses.WAVAX);
  await controller.deployed();

  console.log(`Controller address: ${controller.address}`);
  console.log(
    `Current balance: ${ethers.utils.formatUnits(await deployer.getBalance())}`
  );

  //
  // deploy locker
  //
  const locker = await (
    await ethers.getContractFactory("DGNXLocker")
  ).deploy(token.address);
  await locker.deployed();

  console.log(`Locker address: ${locker.address}`);
  console.log(
    `Current balance: ${ethers.utils.formatUnits(await deployer.getBalance())}`
  );

  //
  // deploy NFT
  //
  const nft = await (
    await ethers.getContractFactory("DGNXPrivateSaleNFT")
  ).deploy(
    "DGNX Private Sale Token",
    "PST",
    "https://dgnx.finance/assets/nfts/private-sale/",
    30,
    35,
    15
  );
  await nft.deployed();

  console.log(`NFT address: ${nft.address}`);
  console.log(`Current balance: ${formatUnits(await deployer.getBalance())}`);

  //
  // deploy sale
  //
  const sale = await (
    await ethers.getContractFactory("DGNXSale")
  ).deploy(token.address, locker.address, nft.address);
  await sale.deployed();

  console.log(`Sale address: ${sale.address}`);
  console.log(`Current balance: ${formatUnits(await deployer.getBalance())}`);

  //
  // deploy legacy disburser
  //
  const disburser = await (
    await ethers.getContractFactory("DGNXLegacyDisburser")
  ).deploy(
    token.address,
    locker.address,
    60 * 60 * 24 * 30, // 30 days
    60 * 60 * 24 * 30 * 3, // 90 days
    10,
    5
  );
  await disburser.deployed();

  console.log(`Legacy Disburser address: ${disburser.address}`);
  console.log(
    `Current balance: ${ethers.utils.formatUnits(await deployer.getBalance())}`
  );

  //
  // Move 3,333,334 DGNX to Sale Contract
  //
  await (await token.transfer(sale.address, tokenDistribution.sale)).wait();
  console.log(
    `Transferred ${tokenDistribution.sale.toString()} DGNX to address ${
      sale.address
    }`
  );

  await (
    await sale.allocateForSale(tokenDistribution.sale, {
      gasLimit: ethers.utils.parseUnits("7000000", "wei"),
    })
  ).wait();
  console.log(`Allocation of ${tokenDistribution.sale.toString()} DGNX`);
  console.log(
    `Current balance: ${ethers.utils.formatUnits(await deployer.getBalance())}`
  );

  //
  // Move 11,260,276 DGNX to Legacy Disburser
  //
  await (
    await token.transfer(disburser.address, tokenDistribution.disburser)
  ).wait();
  console.log(
    `Transferred ${tokenDistribution.disburser.toString()} DGNX to address ${
      disburser.address
    }`
  );
  console.log(
    `Current balance: ${ethers.utils.formatUnits(await deployer.getBalance())}`
  );

  //
  // Move 398,645 DGNX to Marketing Multi Sig Wallet
  //
  await (
    await token.transfer(addresses.MarketingWallet, tokenDistribution.marketing)
  ).wait();
  console.log(
    `Transferred ${formatUnits(
      tokenDistribution.marketing.toString()
    )} DGNX to address ${
      addresses.MarketingWallet
    } and it has now ${formatUnits(
      await token.balanceOf(addresses.MarketingWallet)
    )}`
  );

  console.log(
    `Current balance: ${ethers.utils.formatUnits(await deployer.getBalance())}`
  );

  //
  // add whitelist spots (process json files)
  //
  for (let i = 0; i < whitelistingsJSON.length; i++) {
    const { address, type } = whitelistingsJSON[i];
    await (
      await nft.addToWhitelist(address, type, {
        gasLimit: ethers.utils.parseUnits("7000000", "wei"),
      })
    ).wait();
    console.log(`Added ${address} with type ${type} to whitelist`);
    console.log(
      `Current balance: ${ethers.utils.formatUnits(
        await deployer.getBalance()
      )}`
    );
  }

  //
  // add addresses and amounts to disburser list (process json files)
  //
  const chunkSize = 20;
  for (let i = 0; i < legacyHoldersJSON.length; i += chunkSize) {
    const chunk: any[] = legacyHoldersJSON.slice(i, i + chunkSize);
    const addresses = chunk.map((item) => item.address);
    const amounts = chunk.map((item) => parseEther(item.balance.toString()));
    await (
      await disburser.connect(deployer).addAddresses(addresses, amounts, {
        gasLimit: ethers.utils.parseUnits("7000000", "wei"),
      })
    ).wait();
    console.log(`Added to Legacy Disburser: ${JSON.stringify(chunk)}`);
    console.log(
      `Current balance: ${ethers.utils.formatUnits(
        await deployer.getBalance()
      )}`
    );
  }

  console.log("===================================");
  console.log("Update contract addresses in helper");
  console.log("===================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
