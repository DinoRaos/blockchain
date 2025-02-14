// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MarketplacePayment {
    event Purchase(address indexed seller, address indexed buyer, uint amount);

    // Diese Funktion übernimmt den Betrag (msg.value) und überweist ihn an den Verkäufer.
    // Es wird keinerlei Artikel intern verwaltet.
    function purchase(address payable seller) public payable {
        require(msg.value > 0, "Es muss Ether gesendet werden");
        seller.transfer(msg.value);
        emit Purchase(seller, msg.sender, msg.value);
    }
}
