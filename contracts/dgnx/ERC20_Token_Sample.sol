// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract ERC20_Token_Sample is ERC20Burnable, Ownable {
    constructor() ERC20('ERC20 Token Sample', 'Sample') {
        _mint(msg.sender, 100_000_000 * 10**decimals());
    }
}
