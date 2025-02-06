// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Marketplace {
    uint public itemCount = 0;

    struct Item {
        uint id;
        string name;
        uint price; // Preis in Wei
        address payable seller;
        address payable buyer;
    }

    mapping(uint => Item) public items;

    event ItemListed(uint id, string name, uint price, address seller);
    event ItemBought(uint id, address buyer);

    // Funktion zum Listen eines neuen Artikels
    function listItem(string memory _name, uint _price) public {
        require(_price > 0, "Preis muss groesser als 0 sein");
        itemCount++;
        items[itemCount] = Item(
            itemCount,
            _name,
            _price,
            payable(msg.sender),
            payable(address(0))
        );
        emit ItemListed(itemCount, _name, _price, msg.sender);
    }

    // Funktion zum Kauf eines Artikels
    function buyItem(uint _id) public payable {
        Item storage item = items[_id];
        require(item.id > 0 && item.id <= itemCount, "Artikel existiert nicht");
        require(msg.value >= item.price, "Nicht genug Ether gesendet");
        require(item.buyer == address(0), "Artikel bereits verkauft");
        require(item.seller != msg.sender, "Verkaeufer kann nicht kaufen");

        // Überweise Ether an den Verkäufer
        item.seller.transfer(item.price);
        item.buyer = payable(msg.sender);
        emit ItemBought(_id, msg.sender);
    }
}
