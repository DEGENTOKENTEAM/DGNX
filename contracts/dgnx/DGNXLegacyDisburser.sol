// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import '../interfaces/IDGNXLocker.sol';

contract DGNXLegacyDisburser is ReentrancyGuard, Ownable {
    using SafeERC20 for ERC20;
    using Address for address;
    using SafeMath for uint256;

    address public token;
    address public locker;

    bool public _start = false;

    uint256 public timeInterval; // in seconds
    uint256 public timeStarted; // in seconds
    uint256 public timeIntervalTardyHolder; // in seconds
    uint256 public ppInitial; // percentage points initial payout
    uint256 public ppRecurring; // percentage points recurring payouts

    mapping(address => uint256) public legacyAmounts;
    mapping(address => uint256) public paidOutAmounts;
    mapping(address => uint256) public payouts;
    mapping(address => uint256) public lastPayoutTimestamp;

    address[] private legacyAmountAddresses;

    event AddAddresses(address[] addresses, uint256[] amounts, address sender);
    event StartLegacyDisburser(uint256 timestamp, address sender);
    event StartClaim(uint256 timestamp, address sender, uint256 amount);
    event RecurringClaim(
        uint256 timestamp,
        address sender,
        uint256 amount,
        uint256 currentBalance
    );
    event RemovedTardyHolder(
        uint256 timestamp,
        address sender,
        address tardyHolder,
        uint256 amount
    );

    constructor(
        address _token,
        address _locker,
        uint256 _timeInterval,
        uint256 _timeIntervalTardyHolder,
        uint256 _ppInitial,
        uint256 _ppRecurring
    ) {
        require(
            _token != address(0),
            'DGNXLegacyDisburser::constructor zero address'
        );
        require(
            _locker != address(0),
            'DGNXLegacyDisburser::constructor zero address'
        );
        require(
            _token != _locker,
            'DGNXLegacyDisburser::constructor token and locker same address'
        );
        require(
            _timeInterval > 0,
            'DGNXLegacyDisburser::constructor time interval missing'
        );
        require(
            _timeIntervalTardyHolder > 0,
            'DGNXLegacyDisburser::constructor tardy holder interfal missing'
        );
        require(
            _ppInitial > 0,
            'DGNXLegacyDisburser::constructor wrong initial pp'
        );
        require(
            _ppRecurring > 0,
            'DGNXLegacyDisburser::constructor wrong recurring pp'
        );

        token = _token;
        locker = _locker;
        timeInterval = _timeInterval;
        timeIntervalTardyHolder = _timeIntervalTardyHolder;
        ppInitial = _ppInitial;
        ppRecurring = _ppRecurring;
    }

    modifier _isStarted() {
        require(isStarted(), 'DGNXLegacyDisburser::isStarted not started');
        _;
    }

    modifier _allowedToClaim() {
        require(
            _msgSender() != address(0),
            'DGNXLegacyDisburser::allowedToClaim zero address'
        );
        require(
            legacyAmounts[_msgSender()] > 0,
            'DGNXLegacyDisburser::allowedToClaim not allowed to participate'
        );
        require(
            hasAmountLeft(_msgSender()),
            'DGNXLegacyDisburser::allowedToClaim no amount left'
        );
        _;
    }

    function claimStart() external _isStarted _allowedToClaim {
        require(
            block.timestamp - timeStarted < timeIntervalTardyHolder,
            'DGNXLegacyDisburser::claimStart first claming period is over'
        );
        require(
            paidOutAmounts[_msgSender()] == 0,
            'DGNXLegacyDisburser::claimStart already claimed initial funds'
        );
        uint256 initialPayout = (legacyAmounts[_msgSender()] * ppInitial) / 100;
        require(
            initialPayout <= ERC20(token).balanceOf(address(this)),
            'DGNXLegacyDisburser::claimStart not enough funds claimed initial funds'
        );

        paidOutAmounts[_msgSender()] += initialPayout;
        lastPayoutTimestamp[_msgSender()] = block.timestamp;

        require(
            ERC20(token).transfer(_msgSender(), initialPayout),
            'DGNXLegacyDisburser::claimStart Tx failed'
        );
        emit StartClaim(
            lastPayoutTimestamp[_msgSender()],
            _msgSender(),
            initialPayout
        );
    }

    function claim() external _isStarted _allowedToClaim {
        require(
            paidOutAmounts[_msgSender()] > 0,
            'DGNXLegacyDisburser::claim missing initial claim'
        );

        removeOneTardyHolder();

        (
            uint256 claimable,
            uint256 missedPayouts,
            uint256 currentBalance,
            bool lastClaim
        ) = claimEstimate();

        require(claimable > 0, 'DGNXLegacyDisburser::claimStart not claimable');

        paidOutAmounts[_msgSender()] += claimable;
        payouts[_msgSender()] += missedPayouts;
        lastPayoutTimestamp[_msgSender()] += missedPayouts * timeInterval;

        if (lastClaim) {
            uint256 lockAmount = legacyAmounts[_msgSender()] -
                paidOutAmounts[_msgSender()];
            if (lockAmount > 0) {
                delete legacyAmounts[_msgSender()];
                transferTokensToLocker(lockAmount);
            }
        }

        require(
            ERC20(token).transfer(_msgSender(), claimable),
            'DGNXLegacyDisburser::claimStart Tx failed'
        );

        emit RecurringClaim(
            lastPayoutTimestamp[_msgSender()],
            _msgSender(),
            claimable,
            currentBalance
        );
    }

    function claimEstimate()
        public
        view
        _isStarted
        _allowedToClaim
        returns (
            uint256 claimable,
            uint256 missedPayouts,
            uint256 currentBalance,
            bool lastClaim
        )
    {
        require(
            paidOutAmounts[_msgSender()] > 0,
            'DGNXLegacyDisburser::claimStart missing initial claim'
        );
        uint256 _timeBehind = block.timestamp -
            lastPayoutTimestamp[_msgSender()];
        uint256 _amountLeft = amountLeft(_msgSender());
        currentBalance = ERC20(token).balanceOf(_msgSender());
        missedPayouts =
            (_timeBehind - (_timeBehind % timeInterval)) /
            timeInterval;

        if (missedPayouts > 0) {
            if (payouts[_msgSender()] + missedPayouts >= 24) {
                missedPayouts = 24 - payouts[_msgSender()];
                lastClaim = true;
            }

            uint256 _balance = currentBalance;
            for (uint256 i; i < missedPayouts; i++) {
                _balance += (_balance * ppRecurring) / 100;
            }
            if (_balance - currentBalance > _amountLeft) {
                claimable = _amountLeft;
            } else {
                claimable = _balance - currentBalance;
            }
        }
    }

    function start() external onlyOwner {
        // only once
        require(!_start, 'DGNXLegacyDisburser::start already started');
        _start = true;
        timeStarted = block.timestamp;
        emit StartLegacyDisburser(timeStarted, _msgSender());
    }

    function isStarted() public view returns (bool) {
        return _start;
    }

    function amountLeft(address addr) public view returns (uint256 amount) {
        amount = legacyAmounts[addr];
        if (amount > 0 && paidOutAmounts[addr] > 0) {
            amount = legacyAmounts[addr] - paidOutAmounts[addr];
        }
    }

    function timeLeftUntilNextClaim(address addr)
        public
        view
        returns (uint256 timeLeft)
    {
        if (
            lastPayoutTimestamp[addr] > 0 &&
            lastPayoutTimestamp[addr] + timeInterval > block.timestamp
        ) {
            timeLeft =
                lastPayoutTimestamp[addr] +
                timeInterval -
                block.timestamp;
        }
    }

    function hasAmountLeft(address addr) public view returns (bool) {
        return legacyAmounts[addr] > paidOutAmounts[addr];
    }

    function hasStartedClaiming(address addr) public view returns (bool) {
        return paidOutAmounts[addr] > 0;
    }

    function transferTokensToLocker(uint256 amount) private {
        ERC20(token).safeTransfer(locker, amount);
        IDGNXLocker(locker).sync();
    }

    function addAddresses(address[] memory addresses, uint256[] memory amounts)
        external
        onlyOwner
    {
        require(
            addresses.length == amounts.length,
            'DGNXLegacyDisburser::addBatch not the same length'
        );

        for (uint256 i; i < addresses.length; i++) {
            if (
                legacyAmounts[addresses[i]] == 0 && addresses[i] != address(0)
            ) {
                legacyAmounts[addresses[i]] = amounts[i];
                legacyAmountAddresses.push(addresses[i]);
            }
        }

        emit AddAddresses(addresses, amounts, _msgSender());
    }

    function removeOneTardyHolder() internal {
        if (
            block.timestamp - timeStarted > timeIntervalTardyHolder &&
            legacyAmountAddresses.length > 0
        ) {
            address tardyHolder = address(0);
            uint256 tardyHolderIdx = 0;
            for (
                uint256 i;
                i < legacyAmountAddresses.length && tardyHolder == address(0);
                i++
            ) {
                if (paidOutAmounts[legacyAmountAddresses[i]] == 0) {
                    tardyHolder = legacyAmountAddresses[i];
                    tardyHolderIdx = i;
                }
            }
            if (tardyHolder != address(0)) {
                uint256 transferAmount = legacyAmounts[tardyHolder];
                delete legacyAmounts[tardyHolder];
                delete paidOutAmounts[tardyHolder];
                legacyAmountAddresses[tardyHolderIdx] = legacyAmountAddresses[
                    legacyAmountAddresses.length - 1
                ];
                legacyAmountAddresses.pop();
                require(
                    ERC20(token).transfer(locker, transferAmount),
                    'DGNXLegacyDisburser::removeOneTardyHolder Tx failed'
                );
                IDGNXLocker(locker).sync();

                emit RemovedTardyHolder(
                    block.timestamp,
                    _msgSender(),
                    tardyHolder,
                    transferAmount
                );
            }
        }
    }

    function data()
        external
        view
        returns (
            uint256 claimableAmount,
            uint256 paidOutAmount,
            uint256 totalPayouts,
            uint256 recentClaim
        )
    {
        for (uint256 i; i < legacyAmountAddresses.length; i++) {
            address addr = legacyAmountAddresses[i];
            claimableAmount += legacyAmounts[addr];
            paidOutAmount += paidOutAmounts[addr];
            totalPayouts += payouts[addr];
            if (recentClaim < lastPayoutTimestamp[addr]) {
                recentClaim = lastPayoutTimestamp[addr];
            }
        }
    }
}
