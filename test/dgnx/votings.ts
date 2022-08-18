import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, ContractReceipt } from "ethers";
import { ethers, network } from "hardhat";
import { tokens } from "./../helpers";
import * as dotenv from "dotenv";
dotenv.config();

describe("Governor", () => {
  const description = "Proposal #1: Update Controller to V1";
  const minDelayTimelock = 60 * 60 * 24 * 7; // 1 week
  let updateControllerCall: string;
  let token: Contract,
    busd: Contract,
    controller: Contract,
    timelockController: Contract,
    governor: Contract;
  let owner: SignerWithAddress,
    holderA: SignerWithAddress,
    holderB: SignerWithAddress,
    holderC: SignerWithAddress,
    holderD: SignerWithAddress,
    holderE: SignerWithAddress;

  beforeEach(async () => {
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.NODE_URL,
          blockNumber: parseInt(process.env.NODE_BLOCK || ""),
        },
      },
    ]);
    [owner, holderA, holderB, holderC, holderD, holderE] =
      await ethers.getSigners();

    token = await (await ethers.getContractFactory("DEGENX")).deploy();
    await token.deployed();

    busd = await (
      await ethers.getContractFactory("ERC20_Token_Sample")
    ).deploy();
    await busd.deployed();

    controller = await (
      await ethers.getContractFactory("DGNXController")
    ).deploy(token.address, busd.address);
    await controller.deployed();

    timelockController = await (
      await ethers.getContractFactory("DGNXTimelockController")
    ).deploy(
      60 * 60 * 24 * 7,
      [ethers.constants.AddressZero],
      [ethers.constants.AddressZero]
    );
    await timelockController.deployed();

    governor = await (
      await ethers.getContractFactory("DGNXGovernor")
    ).deploy(token.address, timelockController.address);
    await governor.deployed();

    await (await token.transferOwnership(timelockController.address)).wait();
    await (
      await controller.transferOwnership(timelockController.address)
    ).wait();

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

    await (await token.transfer(holderA.address, tokens(100000))).wait();
    await (await token.transfer(holderB.address, tokens(200000))).wait();
    await (await token.transfer(holderC.address, tokens(400000))).wait();
    await (await token.transfer(holderD.address, tokens(800000))).wait();
    await (await token.transfer(holderE.address, tokens(1600000))).wait();

    await (await token.connect(owner).delegate(owner.address)).wait();
    await (await token.connect(holderA).delegate(holderA.address)).wait();
    await (await token.connect(holderB).delegate(holderB.address)).wait();
    await (await token.connect(holderC).delegate(holderC.address)).wait();
    await (await token.connect(holderD).delegate(holderD.address)).wait();
    await (await token.connect(holderE).delegate(holderE.address)).wait();

    updateControllerCall = token.interface.encodeFunctionData(
      "updateController",
      [controller.address]
    );
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
    expect(proposalId).to.not.be.empty;
    expect(await governor.state(proposalId)).to.equal(0);

    await moveBlocks(11);

    expect(await governor.state(proposalId)).to.equal(1);

    await (await governor.connect(holderA).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderB).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderC).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderD).castVote(proposalId, 2)).wait();
    await (await governor.connect(holderE).castVote(proposalId, 1)).wait();

    expect(await governor.state(proposalId)).to.equal(1);
    const proposalData = await governor.proposals(proposalId);

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

    await moveBlocks(11);

    expect(await governor.state(proposalId)).to.equal(1);

    await (await governor.connect(holderA).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderB).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderC).castVote(proposalId, 0)).wait();
    await (await governor.connect(holderD).castVote(proposalId, 2)).wait();
    await (await governor.connect(holderE).castVote(proposalId, 1)).wait();

    expect(await governor.state(proposalId)).to.equal(1);

    await moveBlocks(45819);

    expect(await governor.state(proposalId)).to.equal(4);

    // queue proposal
    await (
      await governor.connect(holderA)["queue(uint256)"](proposalId)
    ).wait();

    expect(await governor.state(proposalId)).to.equal(5);

    expect(await token.connect(holderA).controller()).to.equal(
      ethers.constants.AddressZero
    );

    // execute proposal
    await expect(
      governor.connect(holderA)["execute(uint256)"](proposalId)
    ).to.be.revertedWith("TimelockController: operation is not ready");

    await moveTime(minDelayTimelock + 1);

    await (
      await governor.connect(holderA)["execute(uint256)"](proposalId)
    ).wait();

    expect(await token.connect(holderA).controller()).to.equal(
      controller.address
    );
  });
});

export async function moveBlocks(amount: number) {
  await network.provider.send("hardhat_mine", [`0x${amount.toString(16)}`]);
}

export async function moveTime(amount: number) {
  await network.provider.send("evm_increaseTime", [`0x${amount.toString(16)}`]);
}
