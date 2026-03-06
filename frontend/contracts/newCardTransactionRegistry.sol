// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./newNirvanaToken.sol";

contract CardTransactionRegistry {

    enum ShipmentStatus {
        IN_TRANSIT_WHOLESALER,
        IN_TRANSIT_RETAILER,
        DELIVERED,
        WHOLESALER_RECEIVED
    }

    struct CardTransaction {
        string strhash;
        ShipmentStatus status;
        bool exists;
    }

    NirvanaToken private _token;

    mapping(string => CardTransaction) private cardTransactions;

    string[] private allCardIds;

    uint256 public transactionFee = 1 * (10 ** 18);

    address public feeCollector;

    constructor(address tokenAddress, address _feeCollector) {

        _token = NirvanaToken(tokenAddress);

        feeCollector = _feeCollector;
    }

    modifier onlyWhitelisted() {

        require(_token.isWhitelisted(msg.sender), "Address not whitelisted");

        _;
    }

    function updateTransactionFee(uint256 newFee) external {

        require(msg.sender == feeCollector, "Only fee collector");

        transactionFee = newFee;
    }

    function parseAddress(string memory _addr)
        internal
        pure
        returns (address)
    {
        bytes memory tmp = bytes(_addr);

        uint160 iaddr = 0;

        uint160 b1;
        uint160 b2;

        for (uint i = 2; i < 42; i += 2) {

            iaddr *= 256;

            b1 = uint160(uint8(tmp[i]));
            b2 = uint160(uint8(tmp[i + 1]));

            if ((b1 >= 97) && (b1 <= 102)) b1 -= 87;
            else if ((b1 >= 65) && (b1 <= 70)) b1 -= 55;
            else if ((b1 >= 48) && (b1 <= 57)) b1 -= 48;

            if ((b2 >= 97) && (b2 <= 102)) b2 -= 87;
            else if ((b2 >= 65) && (b2 <= 70)) b2 -= 55;
            else if ((b2 >= 48) && (b2 <= 57)) b2 -= 48;

            iaddr += (b1 * 16 + b2);
        }

        return address(iaddr);
    }

    function registerCardTransaction(string memory _strhash)
        public
        onlyWhitelisted
    {

        string memory _cardId = slice(_strhash, 136, bytes(_strhash).length);

        require(!cardTransactions[_cardId].exists, "Transaction already exists");

        string memory wholesalerPart = slice(_strhash, 42, 84);

        bool isEmptySpaces = true;

        bytes memory wholesalerBytes = bytes(wholesalerPart);

        for(uint i = 0; i < wholesalerBytes.length; i++) {

            if(wholesalerBytes[i] != 0x20) {

                isEmptySpaces = false;

                break;
            }
        }

        if(!isEmptySpaces && wholesalerBytes.length == 42){

            address wholesalerAddr = parseAddress(wholesalerPart);

            require(
                _token.isWhitelisted(wholesalerAddr),
                "Wholesaler not whitelisted"
            );
        }

        require(
            _token.transferFrom(msg.sender, feeCollector, transactionFee),
            "Fee payment failed"
        );

        ShipmentStatus initialStatus =
            (!isEmptySpaces && wholesalerBytes.length == 42)
            ? ShipmentStatus.IN_TRANSIT_WHOLESALER
            : ShipmentStatus.IN_TRANSIT_RETAILER;

        cardTransactions[_cardId] = CardTransaction({

            strhash: _strhash,
            status: initialStatus,
            exists: true
        });

        allCardIds.push(_cardId);
    }

    function shipmentStatusToString(ShipmentStatus status)
        internal
        pure
        returns (string memory)
    {

        if (status == ShipmentStatus.IN_TRANSIT_WHOLESALER) return "IN_TRANSIT_WHOLESALER";

        if (status == ShipmentStatus.IN_TRANSIT_RETAILER) return "IN_TRANSIT_RETAILER";

        if (status == ShipmentStatus.DELIVERED) return "DELIVERED";

        if (status == ShipmentStatus.WHOLESALER_RECEIVED) return "WHOLESALER_RECEIVED";

        return "invalid_status";
    }

    function getAllTransactions()
        public
        view
        returns (
            string[] memory cardIds,
            string[] memory strhash,
            string[] memory statuses
        )
    {

        uint len = allCardIds.length;

        string[] memory _strhash = new string[](len);
        string[] memory _cardIds = new string[](len);
        string[] memory _statuses = new string[](len);

        for (uint i = 0; i < len; i++) {

            string memory cardId = allCardIds[i];

            CardTransaction memory transaction = cardTransactions[cardId];

            _cardIds[i] = cardId;
            _strhash[i] = transaction.strhash;
            _statuses[i] = shipmentStatusToString(transaction.status);
        }

        return (_cardIds, _strhash, _statuses);
    }

    function registerCardTransactionW(string memory _strhash)
        public
        onlyWhitelisted
    {

        string memory _cardId = slice(_strhash, 136, bytes(_strhash).length);

        require(!cardTransactions[_cardId].exists, "Transaction already exists");

        require(
            _token.transferFrom(msg.sender, feeCollector, transactionFee),
            "Fee payment failed"
        );

        cardTransactions[_cardId] = CardTransaction({

            strhash: _strhash,
            status: ShipmentStatus.IN_TRANSIT_RETAILER,
            exists: true
        });

        allCardIds.push(_cardId);
    }

    function searchCardTransactionWR(string memory _strhash)
        public
        onlyWhitelisted
    {

        string memory _cardId = slice(_strhash, 136, bytes(_strhash).length);

        require(cardTransactions[_cardId].exists, "Transaction not found");

        string memory wholesalerPart = slice(_strhash, 42, 84);

        address wholesalerAddr = parseAddress(wholesalerPart);

        require(msg.sender == wholesalerAddr, "Not assigned wholesaler");

        require(
            _token.transferFrom(msg.sender, feeCollector, transactionFee),
            "Fee payment failed"
        );

        CardTransaction storage transaction = cardTransactions[_cardId];

        require(
            transaction.status == ShipmentStatus.IN_TRANSIT_WHOLESALER,
            "Status incorrect"
        );

        require(
            keccak256(abi.encodePacked(transaction.strhash))
            == keccak256(abi.encodePacked(_strhash)),
            "Hash mismatch"
        );

        transaction.status = ShipmentStatus.WHOLESALER_RECEIVED;
    }

    function searchCardTransactionR(string memory _strhash)
        public
        onlyWhitelisted
    {

        string memory _cardId = slice(_strhash, 136, bytes(_strhash).length);

        require(cardTransactions[_cardId].exists, "Transaction not found");

        string memory retailerPart = slice(_strhash, 84, 126);

        address retailerAddr = parseAddress(retailerPart);

        require(msg.sender == retailerAddr, "Not assigned retailer");

        require(
            _token.transferFrom(msg.sender, feeCollector, transactionFee),
            "Fee payment failed"
        );

        CardTransaction storage transaction = cardTransactions[_cardId];

        require(
            transaction.status == ShipmentStatus.IN_TRANSIT_RETAILER,
            "Status incorrect"
        );

        require(
            keccak256(abi.encodePacked(transaction.strhash))
            == keccak256(abi.encodePacked(_strhash)),
            "Hash mismatch"
        );

        transaction.status = ShipmentStatus.DELIVERED;
    }

    function slice(
        string memory str,
        uint256 startIndex,
        uint256 endIndex
    )
        internal
        pure
        returns (string memory)
    {

        bytes memory strBytes = bytes(str);

        require(endIndex <= strBytes.length, "End exceeds length");

        require(endIndex > startIndex, "Invalid slice");

        uint256 length = endIndex - startIndex;

        bytes memory result = new bytes(length);

        for(uint256 i = 0; i < length; i++) {

            result[i] = strBytes[startIndex + i];
        }

        return string(result);
    }

    function isAddressWhitelisted(address account)
        public
        view
        returns(bool)
    {

        return _token.isWhitelisted(account);
    }

    function getTokenAddress()
        public
        view
        returns(address)
    {

        return address(_token);
    }
}