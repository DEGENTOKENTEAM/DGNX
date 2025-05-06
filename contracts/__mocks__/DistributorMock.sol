// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.26;

import { IFeeGenericFacet } from "./../interfaces/IFeeGenericFacet.sol";
import { FeeConfigSyncHomeDTO, IFeeDistributorFacet } from "./../interfaces/IFeeDistributorFacet.sol";

/// @title DistributorMock
/// @author Daniel <danieldegendev@gmail.com>
contract DistributorMock is IFeeGenericFacet, IFeeDistributorFacet {
    //
    // >>> IFeeGenericFacet
    //
    function feeGenericIsHomeChain() external view returns (bool _is) {}

    function feeGenericGetHomeChainId() external view returns (uint256 _homeChainId) {}

    function feeGenericIsInitialized() external view returns (bool _is) {}

    //
    // feeGenericDepositSingleFeeNative
    //
    uint256 return_feeGenericGetFee_feeAmount;
    uint256 return_feeGenericGetFee_bountyAmount;

    function setReturn_feeGenericDepositSingleFeeNative(uint256 _feeAmount, uint256 _bountyAmount) external {
        return_feeGenericGetFee_feeAmount = _feeAmount;
        return_feeGenericGetFee_bountyAmount = _bountyAmount;
    }

    function feeGenericDepositSingleFeeNative(
        bytes32 _feeId,
        address _bountyReceiver,
        uint256 _bountyShareInBps
    ) external payable returns (uint256 _feeAmount, uint256 _bountyAmount) {
        _feeId;
        _bountyReceiver;
        _bountyShareInBps;
        _feeAmount = return_feeGenericGetFee_feeAmount;
        _bountyAmount = return_feeGenericGetFee_bountyAmount;
    }

    //
    // feeGenericGetFee
    //
    mapping(bytes32 => uint256) return_feeGenericGetFee;

    function setReturn_feeGenericGetFee(bytes32 _feeId, uint256 _fee) external {
        return_feeGenericGetFee[_feeId] = _fee;
    }

    function feeGenericGetFee(bytes32 _feeId) external view returns (uint256 _fee) {
        _fee = return_feeGenericGetFee[_feeId];
    }

    //
    // >>> IFeeDistributorFacet
    //
    event Event_pushFees(address _token, uint256 _amount, FeeConfigSyncHomeDTO _dto);

    function pushFees(address _token, uint256 _amount, FeeConfigSyncHomeDTO calldata _dto) external payable {
        emit Event_pushFees(_token, _amount, _dto);
    }

    function feeDistributorDepositSingleFeeNative(
        bytes32 _feeId,
        address _bountyReceiver,
        uint256 _bountyShareInBps
    ) external payable returns (uint256 _amount, uint256 _bountyAmount) {}
}
