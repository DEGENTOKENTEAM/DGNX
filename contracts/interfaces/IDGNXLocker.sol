// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IDGNXLocker {
    function withdraw(
        address to,
        uint256 amount,
        uint256 proposalId
    ) external;
    function sync() external;
}
