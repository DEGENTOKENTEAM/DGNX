// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import '../interfaces/IDGNXLocker.sol';

contract DGNXLocker is IDGNXLocker, Ownable {
    using SafeERC20 for ERC20;
    using Address for address;

    address public token;
    uint256 public assetBalance;

    event Withdraw(address receipient, uint256 amount, uint256 proposalId);
    event Sync(address sender, uint256 newBalance);

    constructor(address _token) {
        require(_token != address(0), 'DGNXLocker wrong token');
        token = _token;
    }

    function withdraw(
        address to,
        uint256 amount,
        uint256 proposalId
    ) external onlyOwner {
        require(
            amount <= assetBalance,
            'DGNXLocker::withdraw insufficient balance'
        );
        assetBalance -= amount;
        ERC20(token).safeTransfer(to, amount);
        emit Withdraw(to, amount, proposalId);
    }

    function sync() public {
        uint256 _balance = ERC20(token).balanceOf(address(this));
        assetBalance = _balance;
        emit Sync(_msgSender(), _balance);
    }
}
