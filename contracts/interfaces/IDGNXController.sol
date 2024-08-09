// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

/// @title DGNX Controller Interface
/// @author Daniel <danieldegendev@gmail.com>
interface IDGNXController {
    /// Transfers fees from the total amount that is given
    /// @param from sender
    /// @param to receiver
    /// @param amount token amount
    /// @dev amount needs to be sent to this contract before hand so it can be properly distributed
    function transferFees(address from, address to, uint256 amount) external returns (uint256 newAmount);

    /// Estimates a new amount after fees are being cut
    /// @param from sender
    /// @param to receiver
    /// @param amount token amount
    /// @return newAmount the new amount post fee substraction
    /// @return _liquidityAmount @deprecated
    /// @return _backingAmount @deprecated
    /// @return _burnAmount @deprecated
    /// @return _marketingAmount @deprecated
    /// @return _platformAmount @deprecated
    /// @return _launchpadAmount @deprecated
    /// @dev since V3 it just returns the full amount (no fees being charged) or 0 (fees being charged)
    function estimateTransferFees(
        address from,
        address to,
        uint256 amount
    )
        external
        returns (
            uint256 newAmount,
            uint256 _liquidityAmount,
            uint256 _backingAmount,
            uint256 _burnAmount,
            uint256 _marketingAmount,
            uint256 _platformAmount,
            uint256 _launchpadAmount
        );

    /// Initiates a migration
    /// @param _previousController address of the controler which was in place before
    function migration(address _previousController) external;

    /// This one is no in use anymore
    /// @dev @deprecated
    function migrate() external;

    /// allows a contract that can execute a migration
    /// @param addr address of a contract
    function allowContract(address addr) external;

    /// disallows a contract that can execute a migration
    /// @param addr address of a contract
    function removeContract(address addr) external;

    /// Recovers a given token and sends it to a given receiver
    /// @param token address of the token
    /// @param to receiver of the token
    function recoverToken(address token, address to) external;
}
