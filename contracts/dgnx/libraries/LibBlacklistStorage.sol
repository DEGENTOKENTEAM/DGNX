// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.26;

/// @title Lib Blacklist Storage
/// @author Daniel <danieldegendev@gmail.com>
/// @notice Blacklist for the DGNX Controller
library LibBlacklistStorage {
    bytes32 constant STORAGE_POSITION = keccak256("degenx.controller.blacklist.storage.v1");

    struct Storage {
        mapping(address => bool) accounts;
    }

    /// store
    function store() internal pure returns (Storage storage _s) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            _s.slot := position
        }
    }
}
