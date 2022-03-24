// SPDX-License-Identifier: AGPLv3
pragma solidity ^0.8.0;

import {ISuperfluid, ISuperToken, ISuperApp, ISuperAgreement, SuperAppDefinitions} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import {CFAv1Library} from "@superfluid-finance/ethereum-contracts/contracts/apps/CFAv1Library.sol";

import {IConstantFlowAgreementV1} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";

import {SuperAppBase} from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperAppBase.sol";

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

contract SuperFractionalizer is ISuperFractionalizer, SuperAppBase {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    using CFAv1Library for CFAv1Library.InitData;

    //initialize cfaV1 variable
    CFAv1Library.InitData public cfaV1;

    ISuperfluid private _host; // host
    IConstantFlowAgreementV1 private _cfa; // the stored constant flow agreement class address

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

    enum LoanAgreementState {
        initiated,
        inactive,
        active,
        closed
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

    constructor(ISuperTokenFactory factory, ISuperfluid host) {
        _factory = factory;
        dai.safeApprove(address(aaveLendingPool), 2**256 - 1);
        aDai.safeApprove(address(aaveLendingPool), 2**256 - 1);
        assert(address(host) != address(0));
        _host = host;
        _cfa = IConstantFlowAgreementV1(
            address(
                host.getAgreementClass(
                    keccak256(
                        "org.superfluid-finance.agreements.ConstantFlowAgreement.v1"
                    )
                )
            )
        );
        cfaV1 = CFAv1Library.InitData(_host, _cfa);

        uint256 configWord = SuperAppDefinitions.APP_LEVEL_FINAL |
            // change from 'before agreement stuff to after agreement
            SuperAppDefinitions.BEFORE_AGREEMENT_CREATED_NOOP |
            SuperAppDefinitions.BEFORE_AGREEMENT_UPDATED_NOOP |
            SuperAppDefinitions.BEFORE_AGREEMENT_TERMINATED_NOOP;

        _host.registerApp(configWord);
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
        require(
            LoanAgreements[_ricksAddress].agreementState ==
                LoanAgreementState.initiated,
            "loan agreement should be initiated"
        );
        uint256 amount = _amount * decimals;
        dai.transferFrom(msg.sender, address(this), amount);
        dai.approve(address(aaveLendingPool), amount);
        aaveLendingPool.deposit(address(dai), amount, msg.sender, 0);
        LoanAgreements[_ricksAddress].delegator = msg.sender;
        LoanAgreements[_ricksAddress].agreementState = LoanAgreementState
            .inactive;
        // emit Delegate(msg.sender, daiAmount);
    }

    function withdraw(uint256 _amount, address _ricksAddress) public {
        require(
            LoanAgreements[_ricksAddress].delegator == msg.sender,
            "you do not have a delegator yet"
        );
        require(
            LoanAgreements[_ricksAddress].agreementState ==
                LoanAgreementState.inactive,
            "loan agreement should be inactive"
        );
        uint256 amount = _amount * decimals;
        aDai.transferFrom(msg.sender, address(this), amount);
        aaveLendingPool.withdraw(address(dai), amount, msg.sender);
        LoanAgreements[_ricksAddress].agreementState = LoanAgreementState
            .closed;
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
            agreementState: LoanAgreementState.initiated,
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
    function borrow(address _ricksAddress) internal {
        require(
            LoanAgreements[_ricksAddress].delegator != address(0),
            "you do not have a delegator yet"
        );
        require(
            LoanAgreements[_ricksAddress].agreementState ==
                LoanAgreementState.inactive,
            "loan agreement should be inactive"
        );

        uint amountToBorrow = LoanAgreements[_ricksAddress].amount;
        address delegator = LoanAgreements[_ricksAddress].delegator;
        address borrower = LoanAgreements[_ricksAddress].borrower;
        aaveLendingPool.borrow(address(dai), amountToBorrow, 1, 0, delegator);

        // borrowers[msg.sender].borrowed = amountToBorrow;
        LoanAgreements[_ricksAddress].agreementState = LoanAgreementState
            .active;
        dai.approve(borrower, amountToBorrow);
        dai.transfer(borrower, amountToBorrow);
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

        uint borrowedAmount = LoanAgreements[_ricksAddress].amount;
        address delegator = LoanAgreements[_ricksAddress].delegator;

        dai.transferFrom(msg.sender, address(this), borrowedAmount);
        dai.approve(address(aaveLendingPool), borrowedAmount);
        aaveLendingPool.repay(address(dai), borrowedAmount, 1, delegator);
        LoanAgreements[_ricksAddress].agreementState = LoanAgreementState
            .inactive;
    }

    /// @dev If a new stream is opened, or an existing one is opened
    function _aggrementCreated(ISuperToken _superToken) private {
        // @dev This will give me the new flowRate, as it is called in after callbacks
        int96 netFlowRate = _cfa.getNetFlow(_superToken, address(this));

        // @dev If inFlowRate === 0, then delete existing flow.
        if (netFlowRate != int96(0)) {
            // @dev if netFlowRate is zero, delete outflow.
            borrow(address(_superToken));
        }
    }

    /// @dev If a new stream is opened, or an existing one is opened
    function _aggrementTerminated(ISuperToken _superToken) private {
        // @dev This will give me the new flowRate, as it is called in after callbacks
        int96 netFlowRate = _cfa.getNetFlow(_superToken, address(this));

        // @dev If inFlowRate === 0, then delete existing flow.
        if (netFlowRate == int96(0)) {
            // @dev if netFlowRate is zero, delete outflow.
            uint256 streamedAmount = _superToken.balanceOf(address(this));
            if (
                LoanAgreements[address(_superToken)].agreementState ==
                LoanAgreementState.inactive
            ) {
                _superToken.approve(
                    LoanAgreements[address(_superToken)].borrower,
                    streamedAmount
                );
                _superToken.transfer(
                    LoanAgreements[address(_superToken)].borrower,
                    streamedAmount
                );
            } else {
                _superToken.approve(
                    LoanAgreements[address(_superToken)].delegator,
                    streamedAmount
                );
                _superToken.transfer(
                    LoanAgreements[address(_superToken)].delegator,
                    streamedAmount
                );
            }
        }
    }

    function afterAgreementCreated(
        ISuperToken _superToken,
        address _agreementClass,
        bytes32, // _agreementId,
        bytes calldata, /*_agreementData*/
        bytes calldata, // _cbdata,
        bytes calldata _ctx
    )
        external
        override
        onlyExpected(_superToken, _agreementClass, _ctx)
        onlyHost
        returns (bytes memory newCtx)
    {
        _aggrementCreated(_superToken);
        return _ctx;
    }

    function afterAgreementUpdated(
        ISuperToken _superToken,
        address _agreementClass,
        bytes32, //_agreementId,
        bytes calldata agreementData,
        bytes calldata, //_cbdata,
        bytes calldata _ctx
    )
        external
        override
        onlyExpected(_superToken, _agreementClass, _ctx)
        onlyHost
        returns (bytes memory newCtx)
    {
        _aggrementCreated(_superToken);
        return _ctx;
    }

    function afterAgreementTerminated(
        ISuperToken _superToken,
        address _agreementClass,
        bytes32, //_agreementId,
        bytes calldata, /*_agreementData*/
        bytes calldata, //_cbdata,
        bytes calldata _ctx
    ) external override onlyHost returns (bytes memory newCtx) {
        // According to the app basic law, we should never revert in a termination callback
        if (
            !_isTokenExpected(address(_superToken), _ctx) ||
            !_isCFAv1(_agreementClass)
        ) return _ctx;
        _aggrementTerminated(_superToken);
        return _ctx;
    }

    function _isCFAv1(address agreementClass) private view returns (bool) {
        return
            ISuperAgreement(agreementClass).agreementType() ==
            keccak256(
                "org.superfluid-finance.agreements.ConstantFlowAgreement.v1"
            );
    }

    function _isTokenExpected(address _ricksAddress, bytes calldata _ctx)
        private
        view
        returns (bool)
    {
        // decode Context - store full context as uData variable for easy visualization purposes
        address user = _host.decodeCtx(_ctx).msgSender;

        return LoanAgreements[_ricksAddress].borrower == user;
    }

    modifier onlyHost() {
        require(
            msg.sender == address(_host),
            "RedirectAll: support only one host"
        );
        _;
    }

    modifier onlyExpected(
        ISuperToken superToken,
        address agreementClass,
        bytes calldata _ctx
    ) {
        require(
            _isTokenExpected(address(superToken), _ctx),
            "RedirectAll: not expected token"
        );
        require(_isCFAv1(agreementClass), "RedirectAll: only CFAv1 supported");
        _;
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
