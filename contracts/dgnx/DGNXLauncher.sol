// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';

import './../interfaces/IDGNXController.sol';

interface ITransferOwnership {
    function transferOwnership(address newOwner) external;
}

interface IRouter {
    function addLiquidityAVAX(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountAVAXMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountAVAX,
            uint256 liquidity
        );

    function swapExactTokensForAVAX(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactAVAXForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);
}

interface IDGNX {
    function updateController(address _newController) external;
}

contract DGNXLauncher is Ownable {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;

    address constant token = 0x51e48670098173025C477D9AA3f0efF7BF9f7812;
    address constant controller = 0xc5F0f5dA7A57eDd8674652dA500233e562FaA629;
    address constant locker = 0x2c7D8bB6aBA4FFf56cDDBF9ea47ed270A10098F7;

    address constant routerTJOE = 0x60aE616a2155Ee3d9A68541Ba4544862310933d4;
    address constant routerPANGO = 0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106;

    uint256 constant maxAVAXPerPool = 1125 * 10**18;
    uint256 constant maxDGNXPerPool = 1_250_000 * 10**18;

    event Received(address, uint256);

    constructor() {}

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function launch() external onlyOwner {
        uint256 avaxSupply = address(this).balance;
        uint256 dgnxSupply = ERC20(token).balanceOf(address(this));

        require(avaxSupply > 0, 'not enough funds');
        require(dgnxSupply > 0, 'not enough assets');

        uint256 price = maxDGNXPerPool.mul(100).div(maxAVAXPerPool);
        uint256 avaxLeftovers = 0;
        uint256 avaxEach = 0;
        uint256 dgnxEach = 0;
        if (avaxSupply > maxAVAXPerPool.mul(2)) {
            avaxEach = maxAVAXPerPool;
            dgnxEach = maxDGNXPerPool;
            avaxLeftovers = avaxSupply.sub(maxAVAXPerPool.mul(2));
        } else {
            avaxEach = avaxSupply.div(2);
            dgnxEach = price.mul(avaxEach).div(100);
        }

        uint256 dgnxLeftovers = (dgnxSupply > dgnxEach.mul(2))
            ? dgnxSupply.sub(dgnxEach.mul(2))
            : 0;

        ERC20(token).approve(routerTJOE, dgnxEach);
        ERC20(token).approve(routerPANGO, dgnxEach);

        // add liquidity
        IRouter(routerTJOE).addLiquidityAVAX{value: avaxEach}(
            token,
            dgnxEach,
            0,
            0,
            locker,
            block.timestamp
        );

        IRouter(routerPANGO).addLiquidityAVAX{value: avaxEach}(
            token,
            dgnxEach,
            0,
            0,
            locker,
            block.timestamp
        );

        uint256 collected = 0;
        address[] memory pathBuy = new address[](2);
        address[] memory pathSell = new address[](2);
        pathBuy[0] = pathSell[1] = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
        pathBuy[1] = pathSell[0] = token;
        for (uint256 i = 1; i <= 21; i++) {
            if (i % 7 == 0) {
                collected += 2000000000000000005;
                ERC20(token).approve(routerTJOE, collected);
                IRouter(routerTJOE).swapExactTokensForAVAX(
                    collected,
                    0,
                    pathSell,
                    address(this),
                    block.timestamp + 60
                );
                collected = 0;
            } else {
                uint256[] memory amounts = IRouter(routerTJOE)
                    .swapExactAVAXForTokens{value: 1 * 10**17}(
                    0,
                    pathBuy,
                    address(this),
                    block.timestamp + 60
                );
                collected += amounts[1];
            }
        }

        if (avaxLeftovers > 0) {
            require(payable(owner()).send(address(this).balance));
        }

        // move dgnx to locker
        if (dgnxLeftovers > 0) {
            ERC20(token).transfer(
                locker,
                ERC20(token).balanceOf(address(this))
            );
        }

        // update controller on token
        IDGNX(token).updateController(controller);

        // reclaim ownership of contracts
        reclaimOwnership();
    }

    function sync() external payable onlyOwner {
        require(msg.value > 0, 'not enough funds send');
        require(ERC20(token).balanceOf(address(this)) > 0, 'not enough assets');
    }

    function reclaimAssets() public onlyOwner {
        if (address(this).balance > 0) {
            payable(owner()).transfer(address(this).balance);
        }
        if (ERC20(token).balanceOf(address(this)) > 0) {
            ERC20(token).transfer(
                owner(),
                ERC20(token).balanceOf(address(this))
            );
        }
    }

    function reclaimOwnership() public onlyOwner {
        ITransferOwnership(token).transferOwnership(owner());
        ITransferOwnership(controller).transferOwnership(owner());
    }
}
