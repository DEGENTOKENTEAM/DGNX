// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./../interfaces/IDGNXController.sol";
import "./../interfaces/IDGNXDisburser.sol";

import { IRouter } from "./../interfaces/IRouter.sol";
import { IFeeGenericFacet } from "./../interfaces/IFeeGenericFacet.sol";
import { IFeeDistributorFacet, FeeConfigSyncHomeDTO, FeeConfigSyncHomeFees } from "./../interfaces/IFeeDistributorFacet.sol";
import { LibControllerStorage } from "./libraries/LibControllerStorage.sol";

import "hardhat/console.sol";

// TODO Update Fees on Fee Distributor && set DENOMINATOR_RELATIVE to 10 ** 4 to use real bps and remove the absolute calculation. It should return the defo set value, becaus it'll be WEI
// TODO FEE_DISTRIBUTOR_PUSH_ROLE for DGNX Controller V3
// TODO SYNC Fees
/// @title DGNX Controller V3
/// @author Daniel <danieldegendev@gmail.com>
/// @notice This version of the controller now participates in the new fee distribution of the DEGENX Ecosystem
contract DGNXControllerV3 is IDGNXController {
    using Address for address;
    using SafeERC20 for IERC20;

    address public immutable DISTRIBUTOR;
    address public immutable DISBURSER;
    address public immutable DEPLOYER;
    address public immutable WRAPPER;
    address public immutable LOCKER;
    address public immutable TOKEN;

    bool inTransfer = false;

    event AllowContractForMigration(address sender, address target);
    event RemoveContractForMigration(address sender, address target);
    event ExcludeAccount(address account);
    event IncludeAccount(address account);
    event AddLP(address lp);
    event RemoveLP(address lp);
    event MigratingController(address migrator);
    event RecoverToken(address token, uint256 amount);
    event UpdatedFeeIds();
    event Initialized();

    error AlreadyInitialized();
    error NotAllowed();
    error ZeroValueNotAllowed();
    error MissingFeeIds();

    constructor(
        address _token, // dgnx token address
        address _locker, // 0x2c7D8bB6aBA4FFf56cDDBF9ea47ed270A10098F7
        address _wrapper, // wavax token address
        address _disburser, // 0x8a0E3264Da08bf999AfF5a50AabF5d2dc89fab79
        address _distributor // diamond address
    ) {
        TOKEN = _token;
        LOCKER = _locker;
        WRAPPER = _wrapper;
        DISBURSER = _disburser;
        DISTRIBUTOR = _distributor;

        DEPLOYER = msg.sender;
    }

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function initialize(
        bytes32[] calldata _buyFees,
        bytes32[] calldata _sellFees,
        address[] calldata _lps,
        address[] calldata _excludes,
        address _owner
    ) external {
        if (msg.sender != DEPLOYER) revert NotAllowed();

        LibControllerStorage.Storage storage _s = LibControllerStorage.store();
        if (_s.initialized) revert AlreadyInitialized();

        _s.initialized = true;

        _s.owner = _owner;
        _s.excludes[LOCKER] = true;
        _s.excludes[DISBURSER] = true;
        _s.excludes[DISTRIBUTOR] = true;

        for (uint256 i = 0; i < _lps.length; i++) _s.lps[_lps[i]] = true;

        for (uint256 i = 0; i < _excludes.length; i++) _s.excludes[_excludes[i]] = true;

        _updateFeeIds(_buyFees, _sellFees);

        emit Initialized();
    }

    // viewables
    function previousController() external view returns (address _previousController) {
        _previousController = LibControllerStorage.store().previousController;
    }

    function isExcluded(address _account) external view returns (bool _is) {
        _is = LibControllerStorage.store().excludes[_account];
    }

    function isInitialized() external view returns (bool _is) {
        _is = LibControllerStorage.store().initialized;
    }

    function getBuyFees() external view returns (bytes32[] memory _fees) {
        _fees = LibControllerStorage.store().buyFees;
    }

    function getSellFees() external view returns (bytes32[] memory _fees) {
        _fees = LibControllerStorage.store().sellFees;
    }

    function getAllUsedFees() external view returns (bytes32[] memory _fees) {
        _fees = LibControllerStorage.store().allFees;
    }

    function getTotalFees() external view returns (uint256 _totalFees) {
        _totalFees = LibControllerStorage.store().totalFees;
    }

    function isLP(address _lp) external view returns (bool _is) {
        _is = LibControllerStorage.store().lps[_lp];
    }

    // executables

    function transferFees(address _from, address _to, uint256 _amount) external returns (uint256 _newAmount) {
        if (msg.sender != TOKEN) revert NotAllowed(); // only allowed to call by by token
        if (_amount == 0) revert ZeroValueNotAllowed();

        LibControllerStorage.Storage storage _s = LibControllerStorage.store();

        bool _isBuy = _s.lps[_from];
        bool _isSell = _s.lps[_to];
        bool _isExcluded = _s.excludes[_from] || _s.excludes[_to];

        if (!_isExcluded && !_isBuy && !_isSell && _isDisburserWallet(_to)) {
            uint256 _leftover = _amount % 10 ** 4;
            uint256 _tax = (((_amount - _leftover) * 500) / 10 ** 4) + _leftover;
            IERC20(TOKEN).safeTransfer(LOCKER, _tax);
            return _amount - _tax;
        }

        bool _chargeBuyFees = _isBuy && _s.buyFees.length > 0;
        bool _chargeSellFees = _isSell && _s.sellFees.length > 0;

        // TODO test inTransfer when doing nested transfers, normally pushFees should recogniyze this
        if (_isExcluded || (!_chargeBuyFees && !_chargeSellFees) || inTransfer) return _amount;

        inTransfer = true;

        _newAmount = _amount;
        uint256 _totalFees = 0;
        bytes32[] storage _fees = _chargeBuyFees ? _s.buyFees : _s.sellFees;
        for (uint256 i = 0; i < _fees.length; ) {
            (, uint256 _fee) = _chargeFees(_fees[i], _amount);
            _totalFees += _fee;
            unchecked {
                i++;
            }
        }

        _newAmount -= _totalFees;

        if (_isSell && _s.totalFees > 0) _pushFees();

        inTransfer = false;
    }

    function estimateTransferFees(
        address from,
        address to,
        uint256 amount
    )
        external
        view
        returns (
            uint256 newAmount,
            uint256 _liquidityAmount,
            uint256 _backingAmount,
            uint256 _burnAmount,
            uint256 _marketingAmount,
            uint256 _platformAmount,
            uint256 _investmentFundAmount
        )
    {
        _liquidityAmount;
        _backingAmount;
        _burnAmount;
        _marketingAmount;
        _platformAmount;
        _investmentFundAmount;
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();
        bool _isExcluded = _s.excludes[from] || _s.excludes[to];
        bool _isBuy = _s.lps[from];
        bool _isSell = _s.lps[to];
        bool _chargeBuyFees = _isBuy && _s.buyFees.length > 0;
        bool _chargeSellFees = _isSell && _s.sellFees.length > 0;

        if (!_isExcluded && ((!_isBuy && !_isSell && _isDisburserWallet(to)) || _chargeBuyFees || _chargeSellFees)) newAmount = 0;
        else newAmount = amount;
    }

    /* istanbul ignore next */ function migrate() external {}

    // this is called by the token to initiate the migration from the new controller
    function migration(address _previousController) external {
        if (msg.sender != TOKEN) revert NotAllowed();

        if (_previousController == address(this) || _previousController == address(0)) revert NotAllowed();

        LibControllerStorage.Storage storage _s = LibControllerStorage.store();

        _s.previousController = _previousController;
        IDGNXController(_s.previousController).migrate();

        uint256 bA = IERC20(TOKEN).balanceOf(address(this));
        if (bA > 0) IERC20(TOKEN).safeTransfer(_s.owner, bA);

        uint256 bB = IERC20(WRAPPER).balanceOf(address(this));
        if (bB > 0) IERC20(WRAPPER).safeTransfer(_s.owner, bB);

        emit MigratingController(tx.origin);
    }

    /// administrative
    function updateFeeIds(bytes32[] calldata _buyFees, bytes32[] calldata _sellFees) external onlyOwner {
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();

        delete _s.buyFees;
        delete _s.sellFees;
        delete _s.allFees;

        _updateFeeIds(_buyFees, _sellFees);

        emit UpdatedFeeIds();
    }

    function enableLP(address _lp, bool _enable) external onlyOwner {
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();
        _s.lps[_lp] = _enable;
        if (_enable) emit AddLP(_lp);
        else emit RemoveLP(_lp);
    }

    // @todo access control
    function excludeAccount(address _account, bool _exclude) external onlyOwner {
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();
        _s.excludes[_account] = _exclude;
        if (_s.excludes[_account]) emit ExcludeAccount(_account);
        else emit IncludeAccount(_account);
    }

    function recoverToken(address _token, address _to) external onlyOwner {
        if (_token == TOKEN) revert NotAllowed();
        uint256 _balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(_to, _balance);
        emit RecoverToken(_token, _balance);
    }

    /* istanbul ignore next */ function allowContract(address addr) external {}

    /* istanbul ignore next */ function removeContract(address addr) external {}

    /// internals

    function _chargeFees(bytes32 _feeId, uint256 _amount) internal returns (uint256 _amountAfterFee, uint256 _fee) {
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();
        _fee = (_amount * IFeeGenericFacet(DISTRIBUTOR).feeGenericGetFee(_feeId)) / 10 ** 4;
        _amountAfterFee = _amount - _fee;
        _s.totalFees += _fee;
        _s.fees[_feeId] += _fee;
    }

    function _pushFees() internal {
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();
        uint256 _pushableFees = 0;
        for (uint256 i = 0; i < _s.allFees.length; ) {
            if (_s.fees[_s.allFees[i]] > 0) _pushableFees++;
            unchecked {
                i++;
            }
        }

        FeeConfigSyncHomeDTO memory _dto;
        _dto.bountyReceiver = address(0);
        _dto.fees = new FeeConfigSyncHomeFees[](_pushableFees);
        for (uint256 i = 0; i < _s.allFees.length; ) {
            bytes32 _feeId = _s.allFees[i];
            if (_s.fees[_feeId] > 0) {
                unchecked {
                    _pushableFees--;
                }
                _dto.fees[_pushableFees].id = _feeId;
                _dto.fees[_pushableFees].amount = _s.fees[_feeId];
                _dto.totalFees += _s.fees[_feeId];
                _s.fees[_feeId] = 0;
            }
            unchecked {
                i++;
            }
        }
        _s.totalFees -= _dto.totalFees;
        IERC20(TOKEN).safeTransfer(DISTRIBUTOR, _dto.totalFees);
        IFeeDistributorFacet(DISTRIBUTOR).pushFees(TOKEN, _dto.totalFees, _dto);
    }

    function _updateFeeIds(bytes32[] calldata _buyFees, bytes32[] calldata _sellFees) internal {
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();
        for (uint256 i = 0; i < _buyFees.length; i++) {
            _s.buyFees.push(_buyFees[i]);
            _s.allFees.push(_buyFees[i]);
        }
        for (uint256 i = 0; i < _sellFees.length; i++) {
            _s.sellFees.push(_sellFees[i]);
            bool _exists = false;
            for (uint256 j = 0; j < _s.allFees.length; j++) if (_s.allFees[j] == _sellFees[i]) _exists = true;
            if (!_exists) _s.allFees.push(_sellFees[i]);
        }
    }

    function _onlyOwner() internal view {
        if (msg.sender != LibControllerStorage.store().owner) revert NotAllowed();
    }

    function _isDisburserWallet(address _account) internal view returns (bool _is) {
        _is = IDGNXDisburser(DISBURSER).legacyAmounts(_account) > 0;
    }
}
