import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import * as dotenv from "dotenv";
import { BigNumber, Contract, ContractReceipt } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { contracts } from "../../scripts/helpers";
dotenv.config();

describe("Governor", () => {
  const description = "Proposal #1: Update Controller to V1";
  const minDelayTimelock = 60 * 60 * 24 * 2; // 1 week
  let updateControllerCall: string,
    lockerWithdrawCall: string,
    controllerSetBurnTaxCall: string;
  let token: Contract,
    wavax: Contract,
    locker: Contract,
    ftjoe: Contract,
    ptjoe: Contract,
    fpango: Contract,
    ppango: Contract,
    controller: Contract,
    controllerNew: Contract,
    timelockController: Contract,
    governor: Contract;
  let owner: SignerWithAddress,
    holderA: SignerWithAddress,
    holderB: SignerWithAddress,
    holderC: SignerWithAddress,
    holderD: SignerWithAddress,
    holderE: SignerWithAddress;

  beforeEach(async () => {
    // await ethers.provider.send("hardhat_reset", [
    //   {
    //     forking: {
    //       jsonRpcUrl: process.env.NODE_URL,
    //       blockNumber: parseInt(process.env.NODE_BLOCK || ""),
    //     },
    //   },
    // ]);
    [owner, holderA, holderB, holderC, holderD, holderE] =
      await ethers.getSigners();

    // await network.provider.send("hardhat_setBalance", [
    //   owner.address,
    //   "0x487A9A304539440000",
    // ]);
    await network.provider.send("hardhat_setBalance", [
      holderA.address,
      "0x487A9A304539440000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      holderB.address,
      "0x487A9A304539440000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      holderC.address,
      "0x487A9A304539440000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      holderD.address,
      "0x487A9A304539440000",
    ]);
    await network.provider.send("hardhat_setBalance", [
      holderE.address,
      "0x487A9A304539440000",
    ]);

    ({
      token,
      wavax,
      locker,
      controller,
      timelockController,
      governor,
      factoryTJOE: ftjoe,
      factoryPANGO: fpango,
      pairTJOE: ptjoe,
      pairPANGO: ppango,
    } = await contracts());

    // timelockController = await (
    //   await ethers.getContractFactory("DGNXTimelockController")
    // ).deploy(minDelayTimelock, [], [ethers.constants.AddressZero]);
    // await timelockController.deployed();

    // governor = await (
    //   await ethers.getContractFactory("DGNXGovernor")
    // ).deploy(token.address, timelockController.address);
    // await governor.deployed();

    controllerNew = await (
      await ethers.getContractFactory("DGNXControllerV2")
    ).deploy(
      token.address,
      wavax.address,
      [ftjoe.address, fpango.address],
      [ptjoe.address, ppango.address],
      ptjoe.address
    );
    await controllerNew.deployed();

    // grant role to govener contract
    const PROPOSER_ROLE = await timelockController.PROPOSER_ROLE();
    const CANCELLER_ROLE = await timelockController.CANCELLER_ROLE();
    const EXECUTOR_ROLE = await timelockController.EXECUTOR_ROLE();

    await (
      await timelockController
        .connect(owner)
        .grantRole(PROPOSER_ROLE, governor.address)
    ).wait();
    await (
      await timelockController
        .connect(owner)
        .grantRole(CANCELLER_ROLE, governor.address)
    ).wait();
    await (
      await timelockController
        .connect(owner)
        .grantRole(EXECUTOR_ROLE, governor.address)
    ).wait();

    await (await locker.withdraw(owner.address, parseEther("10000"), 0)).wait();
    await (
      await locker.withdraw(holderA.address, parseEther("100000"), 0)
    ).wait();
    await (
      await locker.withdraw(holderB.address, parseEther("200000"), 0)
    ).wait();
    await (
      await locker.withdraw(holderC.address, parseEther("400000"), 0)
    ).wait();
    await (
      await locker.withdraw(holderD.address, parseEther("800000"), 0)
    ).wait();
    await (
      await locker.withdraw(holderE.address, parseEther("1600000"), 0)
    ).wait();

    await (await token.connect(owner).delegate(owner.address)).wait();
    await (await token.connect(holderA).delegate(holderA.address)).wait();
    await (await token.connect(holderB).delegate(holderB.address)).wait();
    await (await token.connect(holderC).delegate(holderC.address)).wait();
    await (await token.connect(holderD).delegate(holderD.address)).wait();
    await (await token.connect(holderE).delegate(holderE.address)).wait();

    updateControllerCall = token.interface.encodeFunctionData(
      "updateController",
      [controllerNew.address]
    );
    lockerWithdrawCall = locker.interface.encodeFunctionData("withdraw", [
      owner.address,
      parseEther("1337"),
      0,
    ]);
    controllerSetBurnTaxCall = controllerNew.interface.encodeFunctionData(
      "setBurnTax",
      [499]
    );

    await (await token.transferOwnership(timelockController.address)).wait(); // prettier-ignore
    await (await controller.transferOwnership(timelockController.address)).wait(); // prettier-ignore
    await (await controllerNew.transferOwnership(timelockController.address)).wait(); // prettier-ignore
    await (await locker.transferOwnership(timelockController.address)).wait(); // prettier-ignore
  });

  it("should be able to create a proposal", async () => {
    await expect(
      governor["propose(address[],uint256[],bytes[],string)"](
        [token.address],
        [3600],
        [updateControllerCall],
        description
      )
    ).to.emit(governor, "ProposalCreated");
  });

  it("should be able to vote on a proposal", async () => {
    const proposalReceipt: ContractReceipt = await (
      await governor["propose(address[],uint256[],bytes[],string)"](
        [token.address],
        [0],
        [updateControllerCall],
        description
      )
    ).wait();

    const proposalId = proposalReceipt?.events![0].args![0];
    console.log(proposalId, proposalReceipt?.events![0].args);
    expect(proposalId).to.not.be.empty;
    expect(await governor.state(proposalId)).to.equal(0);

    await moveBlocks(82201);

    expect(await governor.state(proposalId)).to.equal(1);

    await (await governor.connect(holderA).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderB).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderC).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderD).castVote(proposalId, 2)).wait();
    await (await governor.connect(holderE).castVote(proposalId, 1)).wait();

    expect(await governor.state(proposalId)).to.equal(1);
    const proposalData = await governor.proposals(proposalId);

    console.log(proposalData);

    expect(proposalData["forVotes"]).to.equal(
      ethers.BigNumber.from("1600000000000000000000000")
    );
    expect(proposalData["againstVotes"]).to.equal(
      ethers.BigNumber.from("700000000000000000000000")
    );
    expect(proposalData["abstainVotes"]).to.equal(
      ethers.BigNumber.from("800000000000000000000000")
    );
  });

  it("should be able to queue and execute a proposal", async () => {
    const proposalReceipt: ContractReceipt = await (
      await governor["propose(address[],uint256[],bytes[],string)"](
        [token.address],
        [0],
        [updateControllerCall],
        description
      )
    ).wait();

    const proposalId = proposalReceipt?.events![0].args![0];
    expect(proposalId).to.not.be.empty;
    expect(await governor.state(proposalId)).to.equal(0);

    await moveBlocks(82201);

    expect(await governor.state(proposalId)).to.equal(1);

    await (await governor.connect(holderA).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderB).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderC).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderD).castVote(proposalId, 2)).wait();
    await (await governor.connect(holderE).castVote(proposalId, 1)).wait();

    expect(await governor.state(proposalId)).to.equal(1);

    await moveBlocks(288000);

    expect(await governor.state(proposalId)).to.equal(4);

    // queue proposal
    await (
      await governor.connect(holderA)["queue(uint256)"](proposalId)
    ).wait();

    expect(await governor.state(proposalId)).to.equal(5);

    expect(await token.controller()).to.equal(controller.address);

    // execute proposal
    await expect(
      governor.connect(holderA)["execute(uint256)"](proposalId)
    ).to.be.revertedWith("TimelockController: operation is not ready");

    await moveTime(minDelayTimelock + 1);

    await (
      await governor.connect(holderA)["execute(uint256)"](proposalId)
    ).wait();

    expect(await token.connect(holderA).controller()).to.equal(
      controllerNew.address
    );
  });

  it("should be able to queue and execute a proposal with multiple executions", async () => {
    const proposalReceipt: ContractReceipt = await (
      await governor["propose(address[],uint256[],bytes[],string)"](
        [token.address, locker.address, controllerNew.address],
        [0, 0, 0],
        [updateControllerCall, lockerWithdrawCall, controllerSetBurnTaxCall],
        description
      )
    ).wait();

    const proposalId = proposalReceipt?.events![0].args![0];
    expect(proposalId).to.not.be.empty;
    expect(await governor.state(proposalId)).to.equal(0);

    await moveBlocks(82201);

    expect(await governor.state(proposalId)).to.equal(1);

    await (await governor.connect(holderA).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderB).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderC).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderD).castVote(proposalId, 2)).wait();
    await (await governor.connect(holderE).castVote(proposalId, 1)).wait();

    expect(await governor.state(proposalId)).to.equal(1);

    await moveBlocks(288001);

    expect(await governor.state(proposalId)).to.equal(4);

    // queue proposal
    await (
      await governor.connect(holderA)["queue(uint256)"](proposalId)
    ).wait();

    expect(await governor.state(proposalId)).to.equal(5);

    expect(await token.controller()).to.equal(controller.address);

    // execute proposal
    await expect(
      governor.connect(holderA)["execute(uint256)"](proposalId)
    ).to.be.revertedWith("TimelockController: operation is not ready");

    await moveTime(minDelayTimelock + 1);

    const lockerBalanceBefore: BigNumber = await token.balanceOf(
      locker.address
    );
    const ownerBalanceBefore: BigNumber = await token.balanceOf(owner.address);

    await (
      await governor.connect(holderA)["execute(uint256)"](proposalId)
    ).wait();

    expect(await token.controller()).to.equal(controllerNew.address);
    expect(await controllerNew.burnTax()).to.equal(499);
    expect(await token.balanceOf(owner.address)).to.equal(
      ownerBalanceBefore.add(parseEther("1337"))
    );
    expect(await token.balanceOf(locker.address)).to.equal(
      lockerBalanceBefore.sub(parseEther("1337"))
    );
  });

  it("no one else can execute actions", async () => {
    const transferOwnership = token.interface.encodeFunctionData(
      "transferOwnership",
      [holderA.address]
    );

    await expect(
      timelockController
        .connect(holderA)
        .schedule(
          token.address,
          0,
          transferOwnership,
          ethers.utils.formatBytes32String(""),
          ethers.utils.formatBytes32String("iek"),
          minDelayTimelock
        )
    ).to.be.revertedWith(
      `AccessControl: account ${holderA.address.toLowerCase()} is missing role ${await timelockController.PROPOSER_ROLE()}`
    );
  });
});

export async function moveBlocks(amount: number) {
  await network.provider.send("hardhat_mine", [`0x${amount.toString(16)}`]);
}

export async function moveTime(amount: number) {
  await network.provider.send("evm_increaseTime", [`0x${amount.toString(16)}`]);
}
