import { Contract, ethers } from "ethers";
import { DEGENX, DGNXLegacyDisburser } from "../../typechain";
import { abi as degenxAbi } from "./../../artifacts/contracts/dgnx/DGNX.sol/DEGENX.json";
import { abi as disburserAbi } from "./../../artifacts/contracts/dgnx/DGNXLegacyDisburser.sol/DGNXLegacyDisburser.json";
import addys from "./addresses.json";

const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://api.avax.network/ext/bc/C/rpc"
  );
  const disburser = new Contract(
    "0x8a0E3264Da08bf999AfF5a50AabF5d2dc89fab79",
    disburserAbi,
    provider
  ) as DGNXLegacyDisburser;
  const token = new Contract(
    "0x51e48670098173025C477D9AA3f0efF7BF9f7812",
    degenxAbi,
    provider
  ) as DEGENX;

  const stats = await disburser.data();
  const maxPayouts = 24;
  let overallClaimbaleAmount = stats.claimableAmount
    .sub(stats.paidOutAmount)
    .toBigInt();

  const statistics = {
    active: 0,
    missed: 0,
    finished: 0,
    claimersWithLowBalanceNotMissed: 0,
  };

  for (let i = 0; i < addys.length; i++) {
    const legacyAmount =
      (await disburser.legacyAmounts(addys[i])).toBigInt() / BigInt(10 ** 18);
    const donePayout =
      (await disburser.paidOutAmounts(addys[i])).toBigInt() / BigInt(10 ** 18);
    const payouts = (await disburser.payouts(addys[i])).toNumber();
    const hodlerBal =
      (await token.balanceOf(addys[i])).toBigInt() / BigInt(10 ** 18);

    const legacyAmountRest = parseInt((legacyAmount - donePayout).toString());

    const claimableTotal =
      parseInt(hodlerBal.toString()) * 1.05 ** (maxPayouts - payouts) -
      parseInt(hodlerBal.toString());

    const estimatedPayoutBasedOnBalance = Math.min(
      claimableTotal,
      legacyAmountRest
    );

    overallClaimbaleAmount -= BigInt(estimatedPayoutBasedOnBalance * 10 ** 18);

    const participant = await disburser.hasStartedClaiming(addys[i]);
    if (participant) statistics.active++;

    const finished = !(await disburser.hasAmountLeft(addys[i]));
    if (finished) statistics.finished++;

    const missed = !participant && finished;
    if (missed) statistics.missed++;

    if (parseInt(hodlerBal.toString()) < legacyAmountRest * 0.1 && !missed && !finished)
      statistics.claimersWithLowBalanceNotMissed++;

    console.log({
      address: addys[i],
      participant,
      finished,
      missed,
      hodlerBal,
      legacyAmount,
      donePayout,
      legacyAmountRest,
      estimatedPayoutBasedOnBalance,
      payouts,
      overallClaimbaleAmount,
    });
  }

  console.log({ estimatedLockerAmount: overallClaimbaleAmount, statistics });
};

main().catch((e) => {
  console.log(e);
});
