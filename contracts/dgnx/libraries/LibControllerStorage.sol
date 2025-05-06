// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.26;

/// @title Lib Controller Storage
/// @author Daniel <danieldegendev@gmail.com>
/// @notice Storage for the DGNX Controller
library LibControllerStorage {
    bytes32 constant STORAGE_POSITION = keccak256("degenx.controller.storage.v1");

    struct Storage {
        bool initialized;
        uint256 pushFeesThreshold;
        uint256 totalFees;
        address owner;
        address previousController;
        bytes32[] buyFees;
        bytes32[] sellFees;
        bytes32[] allFees;
        mapping(address => bool) lps;
        mapping(address => bool) excludes;
        mapping(address => bool) migrations;
        mapping(bytes32 => uint256) fees;
    }

    /// store
    function store() internal pure returns (Storage storage _s) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            _s.slot := position
        }
    }
}
