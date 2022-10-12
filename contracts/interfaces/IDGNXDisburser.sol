// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IDGNXDisburser {
    function legacyAmounts(address addr) external view returns (uint256);
}
