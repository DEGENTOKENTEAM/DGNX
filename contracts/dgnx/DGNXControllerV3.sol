// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.26;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import { IDGNXController } from "./../interfaces/IDGNXController.sol";
import { IDGNXDisburser } from "./../interfaces/IDGNXDisburser.sol";
import { IFeeGenericFacet } from "./../interfaces/IFeeGenericFacet.sol";
import { IFeeDistributorFacet, FeeConfigSyncHomeDTO, FeeConfigSyncHomeFees } from "./../interfaces/IFeeDistributorFacet.sol";
import { LibControllerStorage } from "./../dgnx/libraries/LibControllerStorage.sol";
import { LibBlacklistStorage } from "./../dgnx/libraries/LibBlacklistStorage.sol";

/// @title DGNX Controller V3
/// @author Daniel <danieldegendev@gmail.com>
/// @notice This version of the controller now participates in the new fee distribution of the DEGENX Ecosystem
contract DGNXControllerV3 is IDGNXController, AccessControlUpgradeable {
    using Address for address;
    using SafeERC20 for IERC20;

    bytes32 public constant ROLE_OWNER = keccak256("ROLE_OWNER");
    bytes32 public constant ROLE_ADMIN = keccak256("ROLE_ADMIN");
    bytes32 public constant ROLE_MANAGER = keccak256("ROLE_MANAGER");

    address public immutable DISTRIBUTOR;
    address public immutable DISBURSER;
    address public immutable DEPLOYER;
    address public immutable WRAPPER;
    address public immutable LOCKER;
    address public immutable TOKEN;
    address public immutable DAO;

    bool inTransfer = false;

    event AllowContractForMigration(address sender, address target);
    event RemoveContractForMigration(address sender, address target);
    event ExcludeAccount(address account);
    event IncludeAccount(address account);
    event BlacklistAccount(address account);
    event RevokeBlacklistAccount(address account);
    event AddLP(address lp);
    event RemoveLP(address lp);
    event MigratingController(address migrator);
    event RecoverToken(address token, uint256 amount);
    event UpdatedFeeIds();
    event ControllerInitialized();

    error AlreadyInitialized();
    error NotAllowed();
    error ZeroValueNotAllowed();
    error MissingFeeIds();

    constructor(
        address _dao, // timelock controller
        address _token, // dgnx token address
        address _locker, // 0x2c7D8bB6aBA4FFf56cDDBF9ea47ed270A10098F7
        address _wrapper, // wavax token address
        address _disburser, // 0x8a0E3264Da08bf999AfF5a50AabF5d2dc89fab79
        address _distributor // diamond address
    ) {
        DAO = _dao;
        TOKEN = _token;
        LOCKER = _locker;
        WRAPPER = _wrapper;
        DISBURSER = _disburser;
        DISTRIBUTOR = _distributor;

        DEPLOYER = _msgSender();
    }

    /// Initializes the protocol
    /// @param _buyFees array of bytes32
    /// @param _sellFees array of bytes32
    /// @param _lps array of LP addresses
    /// @param _excludes array of addresses that should be excluded from the beginning
    /// @param _owner address of the owner (deployer)
    function initialize(
        bytes32[] calldata _buyFees,
        bytes32[] calldata _sellFees,
        address[] calldata _lps,
        address[] calldata _excludes,
        address _owner
    ) external initializer {
        if (_msgSender() != DEPLOYER) revert NotAllowed();
        if (_owner == address(0)) revert NotAllowed();

        LibControllerStorage.Storage storage _s = LibControllerStorage.store();

        _s.owner = _owner;
        _s.excludes[LOCKER] = true;
        _s.excludes[DISBURSER] = true;
        _s.excludes[DISTRIBUTOR] = true;

        for (uint256 i = 0; i < _lps.length; i++) _s.lps[_lps[i]] = true;

        for (uint256 i = 0; i < _excludes.length; i++) _s.excludes[_excludes[i]] = true;

        _updateFeeIds(_buyFees, _sellFees);

        // oz upgradeable contracts initializing
        __ERC165_init();
        __Context_init();
        __AccessControl_init();

        // set default roles
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _setRoleAdmin(ROLE_OWNER, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(ROLE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(ROLE_MANAGER, DEFAULT_ADMIN_ROLE);
        _grantRole(ROLE_OWNER, _owner);
        _grantRole(ROLE_ADMIN, _owner);
        _grantRole(ROLE_MANAGER, _owner);

        // DAO address available?
        if (DAO != address(0)) _grantRole(ROLE_MANAGER, DAO);

        emit ControllerInitialized();
    }

    // viewables

    /// Returns the previous controller address
    function previousController() external view returns (address _previousController) {
        _previousController = LibControllerStorage.store().previousController;
    }

    /// Checks whether a given account is excluded from fee charges or not
    /// @param _account address of a contract or eoa
    function isExcluded(address _account) external view returns (bool _is) {
        _is = LibControllerStorage.store().excludes[_account];
    }

    /// Checks if the contract is initialized
    function isInitialized() external view returns (bool _is) {
        _is = _getInitializedVersion() > 0;
    }

    /// Returns the current initialized version
    function getInitializedVersion() external view returns (uint8 _version) {
        _version = _getInitializedVersion();
    }

    /// Returns all buy fee ids
    function getBuyFees() external view returns (bytes32[] memory _fees) {
        _fees = LibControllerStorage.store().buyFees;
    }

    /// Returns all sell fee ids
    function getSellFees() external view returns (bytes32[] memory _fees) {
        _fees = LibControllerStorage.store().sellFees;
    }

    /// Returns all unique fee ids
    function getAllUsedFees() external view returns (bytes32[] memory _fees) {
        _fees = LibControllerStorage.store().allFees;
    }

    /// Returns the total fee amount that has been charged
    /// @dev this is a temporary data. It will be set to zero when the fees got pushed to the distributor
    function getTotalFees() external view returns (uint256 _totalFees) {
        _totalFees = LibControllerStorage.store().totalFees;
    }

    /// Checks whether a given address is a configured LP
    /// @param _lp address of a contract
    function isLP(address _lp) external view returns (bool _is) {
        _is = LibControllerStorage.store().lps[_lp];
    }

    // executables

    /// @inheritdoc IDGNXController
    function transferFees(address _from, address _to, uint256 _amount) external returns (uint256 _newAmount) {
        if (_msgSender() != TOKEN) revert NotAllowed(); // only allowed to call by by token
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

    /// @inheritdoc IDGNXController
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
        // blacklist check
        if (LibBlacklistStorage.store().accounts[from] || LibBlacklistStorage.store().accounts[to]) revert NotAllowed();

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

    /// @inheritdoc IDGNXController
    function migration(address _previousController) external {
        if (_msgSender() != TOKEN) revert NotAllowed();

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

    /// Batch Updates all fees that should be applied on trades
    /// @param _buyFees array of bytes32 fee ids
    /// @param _sellFees array of bytes32 fee id
    function updateFeeIds(bytes32[] calldata _buyFees, bytes32[] calldata _sellFees) external onlyRole(ROLE_MANAGER) {
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();

        delete _s.buyFees;
        delete _s.sellFees;
        delete _s.allFees;

        _updateFeeIds(_buyFees, _sellFees);

        emit UpdatedFeeIds();
    }

    /// Enables and disables an LP
    /// @param _lp contract address of a pair
    /// @param _enable flag if the lp should be enabled or not
    function enableLP(address _lp, bool _enable) external onlyRole(ROLE_MANAGER) {
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();
        _s.lps[_lp] = _enable;
        if (_enable) emit AddLP(_lp);
        else emit RemoveLP(_lp);
    }

    /// Excludes and includes an address for getting charged with fees
    /// @param _account address of an account
    /// @param _exclude flag if the account should be excluded or not
    function excludeAccount(address _account, bool _exclude) external onlyRole(ROLE_MANAGER) {
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();
        _s.excludes[_account] = _exclude;
        if (_s.excludes[_account]) emit ExcludeAccount(_account);
        else emit IncludeAccount(_account);
    }

    /// Blacklists an account for being able to operate
    /// @param _account address of an account
    /// @param _blacklist flag if the account should be blacklisted or not
    function blacklistAccount(address _account, bool _blacklist) external onlyRole(ROLE_MANAGER) {
        LibBlacklistStorage.Storage storage _bs = LibBlacklistStorage.store();
        _bs.accounts[_account] = _blacklist;
        if (_bs.accounts[_account]) emit BlacklistAccount(_account);
        else emit RevokeBlacklistAccount(_account);
    }

    /// @inheritdoc IDGNXController
    function recoverToken(address _token, address _to) external onlyRole(ROLE_MANAGER) {
        if (_token == TOKEN) revert NotAllowed();
        uint256 _balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(_to, _balance);
        emit RecoverToken(_token, _balance);
    }

    /* istanbul ignore next */ function allowContract(address addr) external {}

    /* istanbul ignore next */ function removeContract(address addr) external {}

    /// internals

    /// Charges a fee based on a given fee id and the base amount
    /// @param _feeId bytes32 fee id
    /// @param _amount base amount for fee calculation
    /// @return _amountAfterFee the new amount after the fee has been charged
    /// @return _fee the charged fee amount
    function _chargeFees(bytes32 _feeId, uint256 _amount) internal returns (uint256 _amountAfterFee, uint256 _fee) {
        LibControllerStorage.Storage storage _s = LibControllerStorage.store();
        _fee = (_amount * IFeeGenericFacet(DISTRIBUTOR).feeGenericGetFee(_feeId)) / 10 ** 4;
        _amountAfterFee = _amount - _fee;
        _s.totalFees += _fee;
        _s.fees[_feeId] += _fee;
    }

    /// Push the fee to the fee distributor
    /// @dev this is being done only on sells
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

    /// Batch updating the fees
    /// @param _buyFees array of bytes32 fee ids
    /// @param _sellFees array of bytes32 fee ids
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

    /// checks whether an account has still legacy amounts in the disburser
    /// @param _account account to check
    function _isDisburserWallet(address _account) internal view returns (bool _is) {
        _is = IDGNXDisburser(DISBURSER).legacyAmounts(_account) > 0;
    }
}
