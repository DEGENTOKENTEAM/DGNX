// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.26;
import "./../interfaces/IDGNXController.sol";

contract DGNXControllerMock is IDGNXController {
    function previousController() external view returns (address _previousController) {}

    function transferFees(address from, address to, uint256 amount) external returns (uint256 newAmount) {}

    function estimateTransferFees(
        address from,
        address to,
        uint256 amount
    )
        external
        pure
        returns (
            uint256 newAmount,
            uint256 _liquidityAmount,
            uint256 _backingAmount,
            uint256 _burnAmount,
            uint256 _marketingAmount,
            uint256 _platformAmount,
            uint256 _launchpadAmount
        )
    {
        from;
        to;
        _liquidityAmount;
        _backingAmount;
        _burnAmount;
        _marketingAmount;
        _platformAmount;
        _launchpadAmount;
        newAmount = amount;
    }

    event MigrationEvent();

    function migration(address _previousController) external {
        _previousController;
        emit MigrationEvent();
    }

    event MigrateEvent();

    function migrate() external {
        emit MigrateEvent();
    }

    function allowContract(address addr) external {}

    function removeContract(address addr) external {}

    function recoverToken(address token, address to) external {}
}
