import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import * as dotenv from "dotenv";
import { Contract, ContractReceipt } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { contracts } from "../../scripts/helpers";
dotenv.config();

describe("Deployed Governor", () => {
  let owner: SignerWithAddress,
    holderA: SignerWithAddress,
    holderB: SignerWithAddress,
    holderC: SignerWithAddress,
    holderD: SignerWithAddress;
  let token: Contract,
    locker: Contract,
    controller: Contract,
    timelockController: Contract,
    governor: Contract;
  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: parseInt(process.env.NODE_BLOCK || ""),
        },
      },
    ]);
    [owner, holderA, holderB, holderC, holderD] = await ethers.getSigners();

    await network.provider.send("hardhat_setBalance", [
      owner.address,
      "0x487A9A304539440000",
    ]);
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

    ({ token, locker, controller, timelockController, governor } =
      await contracts());

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

    await (await token.connect(owner).delegate(owner.address)).wait();
    await (await token.connect(holderA).delegate(holderA.address)).wait();
    await (await token.connect(holderB).delegate(holderB.address)).wait();
    await (await token.connect(holderC).delegate(holderC.address)).wait();
    await (await token.connect(holderD).delegate(holderD.address)).wait();

    // grant role to govener contract
    const PROPOSER_ROLE = await timelockController.PROPOSER_ROLE();
    const CANCELLER_ROLE = await timelockController.CANCELLER_ROLE();

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
  });

  it("renounce token and reclaim through proposal", async () => {
    const transferOwnership = token.interface.encodeFunctionData(
      "transferOwnership",
      [owner.address]
    );

    await (await token.transferOwnership(timelockController.address)).wait(); // prettier-ignore
    expect(await token.owner()).to.eq(timelockController.address);

    const proposalReceipt: ContractReceipt = await (
      await governor
        .connect(holderA)
        ["propose(address[],uint256[],bytes[],string)"](
          [token.address],
          [0],
          [transferOwnership],
          "descrption"
        )
    ).wait();

    const proposalId = proposalReceipt?.events![0].args![0];
    expect(proposalId).to.not.be.empty;
    expect(await governor.state(proposalId)).to.equal(0);

    await moveBlocks(parseInt(await governor.votingDelay()) + 1);

    expect(await governor.state(proposalId)).to.equal(1);

    await (await governor.connect(holderA).castVote(proposalId, 1)).wait();
    await (await governor.connect(holderB).castVote(proposalId, 1)).wait();
    await (await governor.connect(holderC).castVote(proposalId, 1)).wait();
    await (await governor.connect(holderD).castVote(proposalId, 1)).wait();

    expect(await governor.state(proposalId)).to.equal(1);

    await moveBlocks(parseInt(await governor.votingPeriod()));

    expect(await governor.state(proposalId)).to.equal(4);

    // queue proposal
    await (
      await governor.connect(holderA)["queue(uint256)"](proposalId)
    ).wait();

    expect(await governor.state(proposalId)).to.equal(5);

    // execute proposal
    await expect(
      governor.connect(holderA)["execute(uint256)"](proposalId)
    ).to.be.revertedWith("TimelockController: operation is not ready");

    await moveTime(parseInt(await timelockController.getMinDelay()) + 1);

    await (
      await governor.connect(holderA)["execute(uint256)"](proposalId)
    ).wait();

    expect(await token.owner()).to.equal(owner.address);
  });

  it("renounce controller and reclaim through proposal", async () => {
    const transferOwnership = controller.interface.encodeFunctionData(
      "transferOwnership",
      [owner.address]
    );

    await (await controller.transferOwnership(timelockController.address)).wait(); // prettier-ignore
    expect(await controller.owner()).to.eq(timelockController.address);

    const proposalReceipt: ContractReceipt = await (
      await governor
        .connect(holderA)
        ["propose(address[],uint256[],bytes[],string)"](
          [controller.address],
          [0],
          [transferOwnership],
          "descrption"
        )
    ).wait();

    const proposalId = proposalReceipt?.events![0].args![0];
    expect(proposalId).to.not.be.empty;
    expect(await governor.state(proposalId)).to.equal(0);

    await moveBlocks(parseInt(await governor.votingDelay()) + 1);

    expect(await governor.state(proposalId)).to.equal(1);

    await (await governor.connect(holderA).castVote(proposalId, 1)).wait();
    await (await governor.connect(holderB).castVote(proposalId, 1)).wait();
    await (await governor.connect(holderC).castVote(proposalId, 1)).wait();
    await (await governor.connect(holderD).castVote(proposalId, 1)).wait();

    expect(await governor.state(proposalId)).to.equal(1);

    await moveBlocks(parseInt(await governor.votingPeriod()));

    expect(await governor.state(proposalId)).to.equal(4);

    // queue proposal
    await (
      await governor.connect(holderA)["queue(uint256)"](proposalId)
    ).wait();

    expect(await governor.state(proposalId)).to.equal(5);

    // execute proposal
    await expect(
      governor.connect(holderA)["execute(uint256)"](proposalId)
    ).to.be.revertedWith("TimelockController: operation is not ready");

    await moveTime(parseInt(await timelockController.getMinDelay()) + 1);

    await (
      await governor.connect(holderA)["execute(uint256)"](proposalId)
    ).wait();

    expect(await controller.owner()).to.equal(owner.address);
  });

  it("renounce locker and reclaim through proposal", async () => {
    const transferOwnership = locker.interface.encodeFunctionData(
      "transferOwnership",
      [owner.address]
    );

    await (await locker.transferOwnership(timelockController.address)).wait(); // prettier-ignore
    expect(await locker.owner()).to.eq(timelockController.address);

    const proposalReceipt: ContractReceipt = await (
      await governor
        .connect(holderA)
        ["propose(address[],uint256[],bytes[],string)"](
          [locker.address],
          [0],
          [transferOwnership],
          "descrption"
        )
    ).wait();

    const proposalId = proposalReceipt?.events![0].args![0];
    expect(proposalId).to.not.be.empty;
    expect(await governor.state(proposalId)).to.equal(0);

    await moveBlocks(parseInt(await governor.votingDelay()) + 1);

    expect(await governor.state(proposalId)).to.equal(1);

    await (await governor.connect(holderA).castVote(proposalId, 1)).wait();
    await (await governor.connect(holderB).castVote(proposalId, 1)).wait();
    await (await governor.connect(holderC).castVote(proposalId, 1)).wait();
    await (await governor.connect(holderD).castVote(proposalId, 1)).wait();

    expect(await governor.state(proposalId)).to.equal(1);

    await moveBlocks(parseInt(await governor.votingPeriod()));

    expect(await governor.state(proposalId)).to.equal(4);

    // queue proposal
    await (
      await governor.connect(holderA)["queue(uint256)"](proposalId)
    ).wait();

    expect(await governor.state(proposalId)).to.equal(5);

    // execute proposal
    await expect(
      governor.connect(holderA)["execute(uint256)"](proposalId)
    ).to.be.revertedWith("TimelockController: operation is not ready");

    await moveTime(parseInt(await timelockController.getMinDelay()) + 1);

    await (
      await governor.connect(holderA)["execute(uint256)"](proposalId)
    ).wait();

    expect(await locker.owner()).to.equal(owner.address);
  });
});

export async function moveBlocks(amount: number) {
  await network.provider.send("hardhat_mine", [`0x${amount.toString(16)}`]);
}

export async function moveTime(amount: number) {
  await network.provider.send("evm_increaseTime", [`0x${amount.toString(16)}`]);
}
