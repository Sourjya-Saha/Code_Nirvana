// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NirvanaToken is ERC20, Ownable {
    // Mapping to store whitelisted addresses
    mapping(address => bool) private _whitelist;
    
    // Event emitted when an address is added to the whitelist
    event AddedToWhitelist(address indexed account);
    
    // Event emitted when an address is removed from the whitelist
    event RemovedFromWhitelist(address indexed account);

    constructor(uint256 initialSupply) ERC20("Nirvana Token", "NSC") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * (10 ** decimals()));
    }
    
    /**
     * @dev Adds an address to the whitelist
     * @param account Address to be added to the whitelist
     */
    function addToWhitelist(address account) external onlyOwner {
        require(account != address(0), "Cannot add zero address to whitelist");
        require(!_whitelist[account], "Account is already whitelisted");
        
        _whitelist[account] = true;
        emit AddedToWhitelist(account);
    }
    
    /**
     * @dev Adds multiple addresses to the whitelist
     * @param accounts Addresses to be added to the whitelist
     */
    function addBatchToWhitelist(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i] != address(0) && !_whitelist[accounts[i]]) {
                _whitelist[accounts[i]] = true;
                emit AddedToWhitelist(accounts[i]);
            }
        }
    }
    
    /**
     * @dev Removes an address from the whitelist
     * @param account Address to be removed from the whitelist
     */
    function removeFromWhitelist(address account) external onlyOwner {
        require(_whitelist[account], "Account is not whitelisted");
        
        _whitelist[account] = false;
        emit RemovedFromWhitelist(account);
    }
    
    /**
     * @dev Checks if an address is whitelisted
     * @param account Address to check
     * @return bool True if the address is whitelisted, false otherwise
     */
    function isWhitelisted(address account) public view returns (bool) {
        return _whitelist[account];
    }
    
    /**
     * @dev Override of the _update function to enforce whitelist restrictions
     */
    function _update(address from, address to, uint256 amount) internal override {
        // Skip whitelist check for minting (from = 0) and burning (to = 0)
        if (from != address(0) && to != address(0)) {
            // For transfers, recipient must be whitelisted
            require(_whitelist[to], "ERC20: transfer to non-whitelisted address");
        }
        super._update(from, to, amount);
    }
}