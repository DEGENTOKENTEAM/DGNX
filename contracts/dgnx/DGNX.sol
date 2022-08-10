// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol';
import './../interfaces/IDGNXController.sol';

contract DEGENX is
    ReentrancyGuard,
    ERC20,
    ERC20Burnable,
    ERC20Snapshot,
    Ownable,
    ERC20Permit,
    ERC20Votes
{
    address public controller;
    address public superOwner;

    constructor() ERC20('DegenX', 'DGNX') ERC20Permit('DegenX') {
        _mint(msg.sender, 21_000_000 * 10**decimals());
        superOwner = msg.sender;
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20) {
        if (
            address(0) != from && // mint
            _msgSender() != owner() && // owner
            address(0) != controller && // missing controller
            _msgSender() != controller && // not controller
            from != controller && // not controller
            to != controller // not controller
        ) {
            (uint256 estimatedAmount, , , , , , ) = IDGNXController(controller)
                .estimateTransferFees(from, to, amount);
            if (estimatedAmount < amount) {
                super._transfer(from, controller, amount);
                uint256 updatedAmount = IDGNXController(controller)
                    .transferFees(from, to, amount);
                super._transfer(controller, to, updatedAmount);
            } else {
                super._transfer(from, to, amount);
            }
        } else {
            super._transfer(from, to, amount);
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }

    function updateController(address _newController)
        external
        onlyOwner
        nonReentrant
    {
        require(_newController != address(0), 'No zero address');
        if (controller != address(0)) {
            IDGNXController(controller).allowContract(_newController);
            IDGNXController(_newController).migration(controller);
        }
        controller = _newController;
    }

    function snapshot() public {
        // need additionally a super owner to create snapshot when necessary
        require(
            superOwner == _msgSender() || owner() == _msgSender(),
            'DEGENX::snapshot not allowed'
        );
        _snapshot();
    }
}
