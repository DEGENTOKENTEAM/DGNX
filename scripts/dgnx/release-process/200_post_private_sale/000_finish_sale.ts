import * as dotenv from "dotenv";
import { BigNumber } from "ethers";
import { ethers, network } from "hardhat";

import { contracts } from "../../../helpers";
import { parseEther } from "ethers/lib/utils";

dotenv.config();

async function main() {
  const [owner] = await ethers.getSigners();
  const { sale, token, locker, launcher, controller, pairTJOE, pairPANGO } =
    await contracts();

  console.log(
    `Current balance of ${owner.address} with ${await owner.getBalance()}`
  );

  try {
    console.log("---------------- owner balance ----------------");
    console.log(`Before: ${(await owner.getBalance()).toString()}`);
    console.log("-----------------------------------------------");
    console.log("finishSale start");
    await (await sale.finishSale()).wait();
    console.log("finishSale end");
    console.log("---------------- owner balance ----------------");
    const ownerBalanceFull: BigNumber = await owner.getBalance();
    console.log(`After: ${ownerBalanceFull.toString()}`);
    console.log("-----------------------------------------------");

    console.log("--------------- transfer amount ---------------");
    const transferAmount = ownerBalanceFull.sub(parseEther("5"));
    console.log(transferAmount.toString());
    console.log("-----------------------------------------------");

    /// move all tokens to contract, they will be moved to locker after launch
    console.log("--------------- token transfer ----------------");
    await (
      await token.transfer(
        launcher.address,
        await token.balanceOf(owner.address)
      )
    ).wait();
    console.log(`Launcher balance ${await token.balanceOf(launcher.address)}`);
    console.log("-----------------------------------------------");

    /// transfer amount we got from private sale
    console.log("---------------- AVAX transfer ----------------");
    await (
      await owner.sendTransaction({
        to: launcher.address,
        value: transferAmount,
      })
    ).wait();
    console.log(
      `Launcher balance: ${await ethers.provider.getBalance(launcher.address)}`
    );
    console.log("-----------------------------------------------");

    console.log("---------------- Locker tokens ----------------");
    console.log(
      "Before launch",
      (await token.balanceOf(locker.address)).toString()
    );
    console.log("-----------------------------------------------");

    console.log("------------------ ownership ------------------");
    console.log("owner token", await token.owner());
    console.log("owner controller", await controller.owner());
    console.log("-----------------------------------------------");

    console.log("transfer ownership started");
    /// transfer ownerships
    await (await token.transferOwnership(launcher.address)).wait();
    await (await controller.transferOwnership(launcher.address)).wait();
    console.log("transfer ownership ended");

    console.log("------------------ ownership ------------------");
    console.log("owner token", await token.owner());
    console.log("owner controller", await controller.owner());
    console.log("-----------------------------------------------");
    console.log("launch process started");
    await (
      await launcher.launch({
        gasLimit: ethers.utils.parseUnits("7000000", "wei"),
      })
    ).wait();
    console.log("launch process finished");
    console.log("------------------ ownership ------------------");
    console.log("owner token", await token.owner());
    console.log("owner controller", await controller.owner());
    console.log("-----------------------------------------------");

    console.log("---------------- Locker tokens ----------------");
    console.log(
      "After launch",
      (await token.balanceOf(locker.address)).toString()
    );
    console.log("-----------------------------------------------");

    const [dgnxReserveTJOE, wavaxReserveTJOE] = await pairTJOE?.getReserves();
    const [dgnxReservePANGO, wavaxReservePANGO] =
      await pairPANGO?.getReserves();

    console.log(
      `Price TJOE | DGNXperAVAX ${
        dgnxReserveTJOE / wavaxReserveTJOE
      } | AVAXperDGNX ${wavaxReserveTJOE / dgnxReserveTJOE}`
    );
    console.log(
      `Price PANGO | DGNXperAVAX ${
        dgnxReservePANGO / wavaxReservePANGO
      } | AVAXperDGNX ${wavaxReservePANGO / dgnxReservePANGO}`
    );
    console.log("-----------------------------------------------");
    console.log("---------------- owner balance ----------------");
    console.log(`AFTER ALL: ${(await owner.getBalance()).toString()}`);
  } catch (e) {
    console.log("ERROR", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
