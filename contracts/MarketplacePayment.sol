// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MarketplacePayment is ReentrancyGuard {
    event Purchase(address indexed seller, address indexed buyer, uint256 amount);

    function purchase(address payable seller) public payable nonReentrant {
        require(msg.value > 0, "Es muss Ether gesendet werden");
        require(seller != address(0), "Seller address must not be zero");

        (bool success, ) = seller.call{value: msg.value}("");
        require(success, "Failed to send Ether");

        emit Purchase(seller, msg.sender, msg.value);
    }

    receive() external payable {
        revert("Direct transfers not allowed");
    }

    fallback() external payable {
        revert("Direct transfers not allowed");
    }
}
