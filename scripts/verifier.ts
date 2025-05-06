import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const verifyContract = async function (
  hre: HardhatRuntimeEnvironment,
  name: string,
  options?: { address?: string; args?: any[] }
) {
  try {
    await hre.run('verify:verify', {
      address: options?.address || (await (await ethers.getContract(name)).getAddress()),     
      constructorArguments: options?.args || [],
    });
    return true;
  } catch (e: any) {
    console.log(`Failed to verify ${name} contract: ${e}`);
    if (e.toString().includes('This contract is already verified')) {
      return true;
    }
  }
  return false;
};
