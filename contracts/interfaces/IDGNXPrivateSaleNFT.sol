// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';

interface IDGNXPrivateSaleNFT is IERC721 {
    function lookupTicketType(uint256 tokenId) external view returns (uint256);

    function burn(uint256 tokenId) external;
}
