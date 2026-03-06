// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NirvanaToken is ERC20, Ownable {

    mapping(address => bool) private _whitelist;

    event AddedToWhitelist(address indexed account);
    event RemovedFromWhitelist(address indexed account);

    constructor(uint256 initialSupply)
        ERC20("Nirvana Token", "NSC")
        Ownable(msg.sender)
    {
        _mint(msg.sender, initialSupply * (10 ** decimals()));
    }

    function addToWhitelist(address account) external onlyOwner {
        require(account != address(0), "Zero address not allowed");
        require(!_whitelist[account], "Already whitelisted");

        _whitelist[account] = true;

        emit AddedToWhitelist(account);
    }

    function addBatchToWhitelist(address[] calldata accounts) external onlyOwner {

        for(uint i = 0; i < accounts.length; i++) {

            if(accounts[i] != address(0) && !_whitelist[accounts[i]]) {

                _whitelist[accounts[i]] = true;

                emit AddedToWhitelist(accounts[i]);
            }
        }
    }

    function removeFromWhitelist(address account) external onlyOwner {

        require(_whitelist[account], "Not whitelisted");

        _whitelist[account] = false;

        emit RemovedFromWhitelist(account);
    }

    function isWhitelisted(address account) public view returns(bool) {

        return _whitelist[account];
    }

    function _update(address from, address to, uint256 amount) internal override {

        if (from != address(0) && to != address(0)) {

            require(_whitelist[from], "Sender not whitelisted");

            require(_whitelist[to], "Receiver not whitelisted");
        }

        super._update(from, to, amount);
    }
}