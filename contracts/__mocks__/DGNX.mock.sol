// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import './../dgnx/DGNX.sol';

contract DEGENXtestnet is DEGENX {
    function mint(address to, uint256 amount) external onlyOwner {
        super._mint(to, amount);
    }
}
