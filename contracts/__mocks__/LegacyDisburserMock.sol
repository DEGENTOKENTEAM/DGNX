// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.26;
import "./../interfaces/IDGNXDisburser.sol";

contract LegacyDisburserMock is IDGNXDisburser {
    mapping(address => uint256) return_legacyAmounts;

    function setReturn_legacyAmounts(address addr, uint256 _amount) external {
        return_legacyAmounts[addr] = _amount;
    }

    function legacyAmounts(address addr) external view returns (uint256) {
        return return_legacyAmounts[addr];
    }
}
