// SPDX-License-Identifier: AGPLv3
pragma solidity ^0.8.0;

import {ISuperFractionalizer} from "./interfaces/ISuperFractionalizer.sol";
import {SuperFractionalized} from "./SuperFractionalized.sol";
import {ISuperFractionalized} from "./interfaces/ISuperFractionalized.sol";
import {IStableDebtToken} from "./interfaces/IStableDebtToken.sol";
// import {IPool} from "./interfaces/IPool.sol";
// import {IPoolDataProvider} from "./interfaces/IPoolDataProvider.sol";
import {ILendingPool} from "./interfaces/ILendingPool.sol";
import {IProtocolDataProvider} from "./interfaces/IProtocolDataProvider.sol";

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20, SafeMath} from "./utils/Libraries.sol";
import {ISuperTokenFactory} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperTokenFactory.sol";

contract SuperFractionalizer is ISuperFractionalizer {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Aave pool management ! Mumbai addresses !
    ILendingPool constant aaveLendingPool =
        ILendingPool(address(0xE0fBa4Fc209b4948668006B2bE61711b7f465bAe));
    IProtocolDataProvider constant aaveDataProvider =
        IProtocolDataProvider(
            address(0x3c73A5E5785cAC854D468F727c606C07488a29D6)
        );
    IERC20 constant dai =
        IERC20(address(0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD));
    IERC20 constant aDai =
        IERC20(address(0xdCf0aF9e59C002FA3AA091a46196b37530FD48a8));

    ISuperTokenFactory internal immutable _factory;

    address[] delegatorsList;

    struct Delegator {
        bool exists;
        uint delegated;
        uint loaned;
    }
    mapping(address => Delegator) public delegators;

    address[] borrowersList;

    struct Borrower {
        bool allowed;
        uint borrowed;
        mapping(address => Delegator) linkedDelegators;
    }

    mapping(address => Borrower) borrowers;

    enum LoanAgreementState {
        inactive,
        active,
        finalized
    }

    struct LoanAgreement {
        LoanAgreementState agreementState;
        uint256 tokenId;
        address borrower;
        address delegator;
        uint256 agreementPeriod;
        uint amount;
        address tokenAddress;
    }

    mapping(address => LoanAgreement) public LoanAgreements;
    mapping(address => address[]) public tokenAddressToRicks;

    uint256 constant decimals = 1e18;

    constructor(ISuperTokenFactory factory) {
        _factory = factory;
        dai.safeApprove(address(aaveLendingPool), 2**256 - 1);
        aDai.safeApprove(address(aaveLendingPool), 2**256 - 1);
    }

    /*
     *@notice Utility to send number of contracts associated to a person
     */
    function getRicksCount(address _address) public view returns (uint256) {
        return tokenAddressToRicks[_address].length;
    }

    /**
     * @dev Deposits an amount of dai to aave and delegates all its borrowing power to the pool
     **/
    function delegate(uint256 _amount, address _ricksAddress) public {
        uint256 amount = _amount * decimals;
        dai.safeTransferFrom(msg.sender, address(this), amount);
        aaveLendingPool.deposit(address(dai), amount, msg.sender, 0);
        // if (!delegators[msg.sender].exists) {
        //     delegatorsList.push(msg.sender);
        //     delegators[msg.sender].exists = true;
        // }
        // delegators[msg.sender].delegated += amount;
        LoanAgreements[_ricksAddress].delegator = msg.sender;
        // emit Delegate(msg.sender, daiAmount);
    }

    function depositCollateral(
        address asset,
        uint256 amount,
        bool isPull
    ) public {
        if (isPull) {
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        }
        IERC20(asset).safeApprove(address(aaveLendingPool), amount);
        aaveLendingPool.deposit(asset, amount, address(this), 0);
    }

    function approveBorrower(
        address borrower,
        uint256 amount,
        address asset
    ) public {
        (, address stableDebtTokenAddress, ) = aaveDataProvider
            .getReserveTokensAddresses(asset);
        IStableDebtToken(stableDebtTokenAddress).approveDelegation(
            borrower,
            amount
        );
    }

    function withdraw() public {
        uint256 adaiBalance = aDai.balanceOf(address(msg.sender));
        aDai.approve(address(this), adaiBalance);
        aDai.transferFrom(msg.sender, address(this), adaiBalance);
        aaveLendingPool.withdraw(address(dai), adaiBalance, msg.sender);
    }

    function createLoanAgreement(
        address _tokenAddress,
        string memory _name,
        string memory _symbol,
        uint256 _tokenId,
        uint256 _initialSupply,
        // uint256 _agreementPeriod,
        uint _amount
    ) external {
        uint256 initialSupply = _initialSupply * decimals;
        uint256 amount = _amount * decimals;
        address _ricksAddress = fractionalize(
            _tokenAddress,
            _name,
            _symbol,
            _tokenId,
            initialSupply
        );
        LoanAgreement memory newAgreement = LoanAgreement({
            agreementState: LoanAgreementState.inactive,
            tokenId: _tokenId,
            borrower: msg.sender,
            delegator: address(0),
            agreementPeriod: block.timestamp + 2 days,
            amount: amount,
            tokenAddress: _tokenAddress
        });
        LoanAgreements[_ricksAddress] = newAgreement;
        tokenAddressToRicks[_tokenAddress].push(_ricksAddress);
    }

    // BORROWER METHODS

    /**
     * @dev Uses the pool credit delegation to borrow dai for a whitelisted borrower
     * mints debt tokens for the user
     * the token's rate is aave's stable rate + the pools rate (TBD)
     * borrower has to be whitelisted
     **/
    // function borrow(address _ricksAddress) external {
    //     require(
    //         LoanAgreements[_ricksAddress].borrower == msg.sender,
    //         "not an allowed borrower"
    //     );
    //     require(
    //         LoanAgreements[_ricksAddress].delegator != address(0),
    //         "you do not have a delegator yet"
    //     );
    //     require(
    //         LoanAgreements[_ricksAddress].agreementState ==
    //             LoanAgreementState.inactive,
    //         "loan agreement should be inactive"
    //     );

    //     uint amountToBorrow = LoanAgreements[_ricksAddress].amount;
    //     address delegator = LoanAgreements[_ricksAddress].delegator;
    //     aaveLendingPool.borrow(address(dai), amountToBorrow, 1, 0, delegator);

    //     // borrowers[msg.sender].borrowed = amountToBorrow;
    //     LoanAgreements[_ricksAddress].agreementState = LoanAgreementState
    //         .active;
    //     dai.transfer(msg.sender, amountToBorrow);
    // }

    function borrowFromDelegator(uint256 _amount, address _delegator) external {
        // (, address stableDebtTokenAddress, ) = aaveDataProvider
        //     .getReserveTokensAddresses(address(dai));
        // IStableDebtToken(stableDebtTokenAddress).approveDelegation(
        //     address(this),
        //     _amount
        // );
        aaveLendingPool.borrow(address(dai), _amount, 1, 0, _delegator);
        // dai.transfer(msg.sender, _amount);
    }

    /**
     * @dev Borrowers burns a part of their debt by sending a corresponding amount of dai
     * borrower has to be whitelisted
     **/
    function repay(address _ricksAddress) external {
        require(
            LoanAgreements[_ricksAddress].borrower == msg.sender,
            "not an allowed borrower"
        );
        require(
            LoanAgreements[_ricksAddress].delegator != address(0),
            "you do not have a delegator yet"
        );
        require(
            LoanAgreements[_ricksAddress].agreementState ==
                LoanAgreementState.active,
            "loan agreement is not active"
        );
        // (, address stableDebtTokenAddress, ) = aaveDataProvider
        //     .getReserveTokensAddresses(address(dai));
        // IStableDebtToken debtToken = IStableDebtToken(
        //     address(stableDebtTokenAddress)
        // );

        uint borrowedAmount = LoanAgreements[_ricksAddress].amount;
        address delegator = LoanAgreements[_ricksAddress].delegator;

        dai.transferFrom(msg.sender, address(this), borrowedAmount);
        aaveLendingPool.repay(address(dai), borrowedAmount, 1, delegator);
    }

    /// @dev Implementation of ISuperFractionalizer.fractionalize
    /// MUST have approved SuperFractionalizer
    /// MUST be owner of NFT
    function fractionalize(
        address _tokenAddress,
        string memory _name,
        string memory _symbol,
        uint256 _tokenId,
        uint256 _initialSupply
    ) internal returns (address _superFractionalized) {
        IERC721 _erc721 = IERC721(_tokenAddress);
        // CHECKS
        if (msg.sender != _erc721.ownerOf(_tokenId)) revert NotTokenOwner();
        if (address(this) != _erc721.getApproved(_tokenId))
            revert NotApproved();

        // DEPLOY
        bytes32 salt = keccak256(abi.encode(_erc721, _tokenId));
        bytes memory bytecode = type(SuperFractionalized).creationCode;
        assembly {
            _superFractionalized := create2(
                0,
                add(bytecode, 32),
                mload(bytecode),
                salt
            )
        }

        // UPGRADE WITH THE FACTORY
        _factory.initializeCustomSuperToken(_superFractionalized);

        // INTIALIZE
        ISuperFractionalized(_superFractionalized).initialize(
            _name,
            _symbol,
            _initialSupply,
            _tokenId,
            address(_erc721),
            msg.sender
        );

        // LOCK THE NFT
        _erc721.transferFrom(msg.sender, address(this), _tokenId);

        // EMIT
        emit Fractionalized(
            msg.sender,
            address(_erc721),
            _tokenId,
            _superFractionalized,
            _initialSupply
        );
    }
}
