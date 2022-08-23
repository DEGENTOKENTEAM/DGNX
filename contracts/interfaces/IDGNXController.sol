// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IDGNXController {
    function transferFees(
        address from,
        address to,
        uint256 amount
    ) external returns (uint256 newAmount);

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

    function migration(address _previousController) external;

    function migrate() external;

    function allowContract(address addr) external;

    function removeContract(address addr) external;

    function recoverToken(address token, address to) external;

    function isAllowed(address addr) external view returns (bool);

    function feeOff() external;

    function feeOn() external;
}
