// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILendingPool {
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    function repay(
        address asset,
        uint256 amount,
        uint256 rateMode,
        address onBehalfOf
    ) external returns (uint256);

    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external;
}

interface IStableDebtToken {
    function approveDelegation(address delegatee, uint256 amount) external;
}

interface IProtocolDataProvider {
    function getReserveTokensAddresses(address asset) external view returns (address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress);
}

contract Supertest {
    ILendingPool lendingPool;
    IERC20 wethToken;
    IERC20 aDai;
    IProtocolDataProvider aDataProvider;
    uint256 constant decimals = 1e18;

    // Mainnet WETH 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    // Kovan WETH 0xd0A1E359811322d97991E03f863a0C30C2cF029C
    // Rinkeby WETH 0xc778417e063141139fce010982780140aa0cd5ab
    constructor(address assetAddr, address aLendingPoolAddr, address aDataProviderAddr, address aTokenAddr) {
        lendingPool = ILendingPool(aLendingPoolAddr);
        wethToken = IERC20(assetAddr);
        aDai = IERC20(aTokenAddr);
        aDataProvider = IProtocolDataProvider(aDataProviderAddr);
    }

    function currentContractBalance() public view returns (uint) {
        return wethToken.balanceOf(address(this));
    }

    function deposit(uint256 _amount) public {
        require(_amount > 0, "Invalid amount");
        uint256 amount = _amount * decimals;

        bool success = wethToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        require(success, "Transfer to contract failed");
        wethToken.approve(address(lendingPool), amount);
        lendingPool.deposit(address(wethToken), amount, msg.sender, 0);
    }

    function borrowFromPool(uint256 _amount, address _delegator) public {
        require(_amount > 0, "Invalid amount");
        uint256 amount = _amount * decimals;

        lendingPool.borrow(address(wethToken), amount, 1, 0, _delegator);

        wethToken.approve(msg.sender, amount);
        wethToken.transfer(msg.sender, amount);
    }

    function repay(uint256 _amount, address _delegator) external {
        uint256 amount = _amount * decimals;
        wethToken.transferFrom(msg.sender, address(this), amount);
        wethToken.approve(address(lendingPool), amount);
        lendingPool.repay(address(wethToken), amount, 1, _delegator);
    }

    function withdrawForFan(uint256 _amount) public {
        uint256 amount = _amount * decimals;
        aDai.transferFrom(msg.sender, address(this), amount);
        lendingPool.withdraw(address(wethToken), amount, msg.sender);
    }
}
