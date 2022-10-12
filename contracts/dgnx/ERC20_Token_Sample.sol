// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract ERC20_Token_Sample is ERC20Burnable, Ownable {
    constructor(string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
    {
        _mint(msg.sender, 100_000_000 * 10**decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        super._mint(to, amount);
    }
}
