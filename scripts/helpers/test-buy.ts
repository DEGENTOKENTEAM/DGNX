import { ContractReceipt, ethers } from "ethers";
import { AbiCoder } from "ethers/lib/utils";
import { tokens } from "../../test/helpers";
import * as dotenv from "dotenv";
dotenv.config();

const abi = require("./abi-router.json");
const erc20Abi = require("./abi-erc20.json");
const walletAddr = "0x2D28AA94edD503c529292Ae65821b504a43c9D15";
const tokenAddress = "0x48C76F01C2D0C2e613f05aaAED45ce91d92873f0";
const busdAddress = "0x4Dd9216C85093A2b4E457Ff91D5c606B90C1ECa3";
// const routerAddr = "0x688d21b0B8Dc35971AF58cFF1F7Bf65639937860"; // pangolin
const routerAddr = "0xd7f655E3376cE2D7A2b08fF01Eb3B1023191A901"; // traderjoe

const privateKey = `0x${process.env.PRIVATE_KEY_TEST}`;
const provider = new ethers.providers.JsonRpcProvider(
  "https://api.avax-test.network/ext/C/rpc"
);

const wallet = new ethers.Wallet(privateKey);
const account = wallet.connect(provider);

const router = new ethers.Contract(routerAddr, abi, account);
const busdToken = new ethers.Contract(busdAddress, erc20Abi, account);

(async () => {
  try {
    const gasPrice = await provider.getGasPrice();
    const gasLimit = ethers.utils.parseUnits("7000000", "wei");
    const gas = {
      gasPrice: gasPrice,
      gasLimit: gasLimit,
    };

    const approveReceipt: ContractReceipt = await (
      await busdToken
        .connect(account)
        .approve(
          router.address,
          ethers.BigNumber.from("1000000000000000000000")
        )
    ).wait();

    console.log("approveReceipt.events", approveReceipt.events);

    // const tx = await router
    //   .connect(account)
    //   .swapExactTokensForTokens(
    //     ethers.BigNumber.from("10000000000000000000"),
    //     ethers.BigNumber.from("0"),
    //     [busdAddress, tokenAddress],
    //     walletAddr,
    //     Math.floor(new Date().getTime() / 1000) + 60,
    //     { ...gas }
    //   );
    const tx = await router
      .connect(account)
      .swapExactTokensForTokensSupportingFeeOnTransferTokens(
        ethers.BigNumber.from("1000000000000000000000"),
        ethers.BigNumber.from("0"),
        [busdAddress, tokenAddress],
        walletAddr,
        Math.floor(new Date().getTime() / 1000) + 60,
        { ...gas }
      );

    const buyReceipt = await tx.wait();

    console.log("buyReceipt", buyReceipt);
  } catch (error) {
    console.log(error);
  }
})();
