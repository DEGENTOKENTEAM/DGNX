import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractReceipt, Contract } from "ethers";
export function tokens(amount: number, decimals?: number, _nullPad?: number) {
  let nullPad = _nullPad || 18;
  const _decimals = decimals;
  nullPad -= _decimals?.toString() ? _decimals?.toString().length : 0;
  return ethers.BigNumber.from(
    amount.toString() + (decimals?.toString() ?? "") + "".padStart(nullPad, "0")
  );
}

export async function createPair(
  owner: SignerWithAddress,
  factory: string,
  tokenA: string,
  tokenB: string
): Promise<string> {
  const factoryAbi = [
    "function getPair(address tokenA, address tokenB) external view returns (address pair)",
    "function createPair(address tokenA, address tokenB) external returns (address pair)",
  ];

  const f = new ethers.Contract(factory, factoryAbi, owner);
  const abiCoder = new ethers.utils.AbiCoder();
  const pairTxReceipt: ContractReceipt = await (
    await f.connect(owner).createPair(tokenA, tokenB)
  ).wait();
  const [basePair] = abiCoder.decode(
    ["address"],
    pairTxReceipt.events![0].data,
    false
  );
  return basePair;
}

export function pairByAddress(
  owner: SignerWithAddress,
  addr: string
): Contract {
  const pairAbi = [
    "function balanceOf(address owner) external view returns (uint)",
    "function mint(address to) external returns (uint liquidity)",
    "function sync() external",
  ];
  return new ethers.Contract(addr, pairAbi, owner);
}
