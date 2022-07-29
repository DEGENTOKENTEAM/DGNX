import { BigNumber, BigNumberish, ethers } from "ethers";
const abiRouter = require("./../helpers/abi-router.json");
const abiPair = require("./../helpers/abi-pair.json");
const abiToken = require("./../helpers/abi-erc20.json");
const rpcUrl = "https://rpc.fuse.io";
const tokenPairAddr = "0x0F2e60B799F2237633754F8eeC7970C125e15D75";
const tokenAddr = "0xc2e299b47398963c618de5b05c6bdecd4cc64022";
const routerAddr = "0xE3F85aAd0c8DD7337427B9dF5d0fB741d65EEEB5";
const wfuseAddr = "0x0be9e53fd7edac9f859882afdda116645287c629";

const privateKey = `0xb9c085af5f674b8b0942dcdec8d47fe3e5623f8560b6272560902ec0e8cbb091`;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

const wallet = new ethers.Wallet(privateKey);
const account = wallet.connect(provider);

const router = new ethers.Contract(routerAddr, abiRouter, account);
const pair = new ethers.Contract(tokenPairAddr, abiPair, account);
const token = new ethers.Contract(tokenAddr, abiToken, account);

(async () => {
  while (true) {
    const balance: BigNumber = await token.balanceOf(pair.address);
    if (balance.gte(ethers.BigNumber.from("60000000000000000000"))) {
      const walletBalance: BigNumber = await token.balanceOf(account.address);
      if (walletBalance.gt(ethers.BigNumber.from("0"))) {
        console.log(`Has Coineus Balance: ${walletBalance.toString()}`);
      } else {
        console.log("try to buy");
        try {
          await (
            await token
              .connect(account)
              .approve(
                router.address,
                ethers.BigNumber.from("710000000000000000000")
              )
          ).wait();
          const gasFees = await router
            .connect(account)
            .estimateGas.swapExactTokensForTokens(
              ethers.BigNumber.from("710000000000000000000"),
              ethers.BigNumber.from("0"),
              [wfuseAddr, tokenAddr],
              account.address,
              Math.floor(new Date().getTime() / 1000) + 60
            );
          // const receipt = await router
          //   .connect(account)
          //   .swapExactTokensForTokens(
          //     ethers.BigNumber.from("710000000000000000000"),
          //     ethers.BigNumber.from("0"),
          //     [wfuseAddr, tokenAddr],
          //     account.address,
          //     Math.floor(new Date().getTime() / 1000) + 60
          //   );
          // const amounts: any[] = await receipt.wait();
          // console.log(`Bought ${amounts[amounts.length - 1]}`);
        } catch (e) {
          console.log("Fail to buy", e);
        }
      }
    } else {
      console.log(
        `Waiting for liquidity: ${(
          await token.balanceOf(pair.address)
        ).toString()}`
      );
    }
  }

  // router
  //   .connect(account)
  //   .swapExactTokensForTokens(
  //     ethers.BigNumber.from(""),
  //     ethers.BigNumber.from("0"),
  //     [wfuseAddr, tokenAddr],
  //     account.address,
  //     Math.floor(new Date().getTime() / 1000) + 60
  //   );
})();
