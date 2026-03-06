// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./NirvanaToken.sol";

contract CardTransactionRegistry {
    enum ShipmentStatus { IN_TRANSIT_WHOLESALER, IN_TRANSIT_RETAILER, DELIVERED, WHOLESALER_RECEIVED }

    struct CardTransaction {
        string strhash;         
        ShipmentStatus status;   
        bool exists;             
    }

    // Reference to the NirvanaToken contract
    NirvanaToken private _token;
    
    mapping(string => CardTransaction) private cardTransactions;
    string[] private allCardIds;

    // Transaction fee in tokens
    uint256 public transactionFee = 1 * (10 ** 18); // 1 NSC with 18 decimals
    
    // Address where fees will be collected
    address public feeCollector;

    constructor(address tokenAddress, address _feeCollector) {
        _token = NirvanaToken(tokenAddress);
        feeCollector = _feeCollector;
    }
    
    // Function to update transaction fee
    function updateTransactionFee(uint256 newFee) external {
        require(msg.sender == feeCollector, "Only fee collector can update fees");
        transactionFee = newFee;
    }

    function registerCardTransaction(string memory _strhash) public {
        string memory _cardId = slice(_strhash, 136, bytes(_strhash).length);
        require(!cardTransactions[_cardId].exists, "Transaction with this card ID already exists!");
        
        // Collect transaction fee
        require(_token.transferFrom(msg.sender, feeCollector, transactionFee), "Fee payment failed");
        
        // Slice the string from index 42 to 84 to check wholesaler address
        string memory wholesalerPart = slice(_strhash, 42, 84);
        
        // Check if wholesalerPart is not just empty spaces
        bool isEmptySpaces = true;
        bytes memory wholesalerBytes = bytes(wholesalerPart);
        
        // Check each character
        for(uint i = 0; i < wholesalerBytes.length; i++) {
            if(wholesalerBytes[i] != 0x20) { // 0x20 is hex for space character
                isEmptySpaces = false;
                break;
            }
        }

        // Set initial status based on whether wholesaler address contains non-space characters
        ShipmentStatus initialStatus = (!isEmptySpaces && wholesalerBytes.length == 42) 
            ? ShipmentStatus.IN_TRANSIT_WHOLESALER 
            : ShipmentStatus.IN_TRANSIT_RETAILER;

        cardTransactions[_cardId] = CardTransaction({
            strhash: _strhash,
            status: initialStatus,
            exists: true
        });

        allCardIds.push(_cardId);
    }

    function shipmentStatusToString(ShipmentStatus status) internal pure returns (string memory) {
        if (status == ShipmentStatus.IN_TRANSIT_WHOLESALER) return "IN_TRANSIT_WHOLESALER";
        if (status == ShipmentStatus.IN_TRANSIT_RETAILER) return "IN_TRANSIT_RETAILER";
        if (status == ShipmentStatus.DELIVERED) return "DELIVERED"; 
        if (status == ShipmentStatus.WHOLESALER_RECEIVED) return "WHOLESALER_RECEIVED";       
        return "invalid_status";
    }

    function getAllTransactions() public view returns (
        string[] memory cardIds,
        string[] memory strhash,
        string[] memory statuses
    ) {
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

    function registerCardTransactionW(string memory _strhash) public {
        string memory _cardId = slice(_strhash, 136, bytes(_strhash).length);   
        require(!cardTransactions[_cardId].exists, "Transaction with this card ID already exists!");
        
        // Collect transaction fee
        require(_token.transferFrom(msg.sender, feeCollector, transactionFee), "Fee payment failed");

        cardTransactions[_cardId] = CardTransaction({       
            strhash: _strhash,  
            status: ShipmentStatus.IN_TRANSIT_RETAILER,      
            exists: true
        });  

        allCardIds.push(_cardId);   
    } 

    function searchCardTransactionWR(string memory _strhash) public {
        string memory _cardId = slice(_strhash, 136, bytes(_strhash).length);
        require(cardTransactions[_cardId].exists, "Transaction with this card ID does not exist!");

        // Collect transaction fee
        require(_token.transferFrom(msg.sender, feeCollector, transactionFee), "Fee payment failed");

        CardTransaction storage transaction = cardTransactions[_cardId];
        require(transaction.status == ShipmentStatus.IN_TRANSIT_WHOLESALER, "Status should be IN_TRANSIT_WHOLESALER");
        require(
            keccak256(abi.encodePacked(transaction.strhash)) == keccak256(abi.encodePacked(_strhash)),
            string(abi.encodePacked("Hash mismatch: ", transaction.strhash))
        );

        transaction.status = ShipmentStatus.WHOLESALER_RECEIVED;
    }

    function searchCardTransactionR(string memory _strhash) public {
        string memory _cardId = slice(_strhash, 136, bytes(_strhash).length);
        require(cardTransactions[_cardId].exists, "Transaction with this card ID does not exist!");

        // Collect transaction fee
        require(_token.transferFrom(msg.sender, feeCollector, transactionFee), "Fee payment failed");

        CardTransaction storage transaction = cardTransactions[_cardId];
        require(transaction.status == ShipmentStatus.IN_TRANSIT_RETAILER, "Status should be IN_TRANSIT_RETAILER");
        require(
            keccak256(abi.encodePacked(transaction.strhash)) == keccak256(abi.encodePacked(_strhash)),
            string(abi.encodePacked("Hash mismatch: ", transaction.strhash))
        );

        transaction.status = ShipmentStatus.DELIVERED;
    }

    function slice(string memory str, uint256 startIndex, uint256 endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        require(endIndex <= strBytes.length, "End index exceeds string length");
        require(endIndex > startIndex, "End index must be greater than start index");

        uint256 length = endIndex - startIndex;
        bytes memory result = new bytes(length);

        for (uint256 i = 0; i < length; i++) {
            result[i] = strBytes[startIndex + i];
        }

        return string(result);
    }
    
    // Check if the token contract considers an address whitelisted
    function isAddressWhitelisted(address account) public view returns (bool) {
        return _token.isWhitelisted(account);
    }
    
    // Get token address
    function getTokenAddress() public view returns (address) {
        return address(_token);
    }
}