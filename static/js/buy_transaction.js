// Funktion, um die Verkäuferadresse abzurufen
async function getSellerAddress(itemId) {
  const response = await fetch(`/get_seller/${itemId}`);
  const data = await response.json();

  if (data.seller_address) {
    return data.seller_address;
  } else {
    throw new Error("Seller address not found.");
  }
}

// Funktion für die Transaktion
async function performTransaction(sellerAddress, priceEth) {
  // Verbindungsaufbau zum Ethereum-Netzwerk mit MetaMask
  if (window.ethereum) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);  // Korrekte Verwendung von Web3Provider
    const signer = await provider.getSigner();

    // Umwandlung von ETH in wei (Ethereum-Mindestwährungseinheit)
    const value = ethers.utils.parseEther(priceEth);

    // Erstellung der Transaktion
    const tx = await signer.sendTransaction({
      to: sellerAddress,
      value: value
    });

    // Rückgabe der Transaktion
    return tx;
  } else {
    throw new Error("Ethereum provider not found. Please install MetaMask.");
  }
}

// Funktion zum Kauf eines Artikels
async function buyItem(itemId, priceEth) {
  try {
    const sellerAddress = await getSellerAddress(itemId);
    console.log(`Verkäufer-Adresse: ${sellerAddress}`);

    // Durchführung der Transaktion
    const transaction = await performTransaction(sellerAddress, priceEth);
    console.log('Transaktion erfolgreich:', transaction);

    // Sende die Transaktionsdaten an den Backend-Endpunkt
    const response = await fetch(`/buy/offer/${itemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        buyer_address: await (new ethers.providers.Web3Provider(window.ethereum).getSigner()).getAddress(),
        tx_hash: transaction.hash,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      alert("Kauf erfolgreich! Transaktionshash: " + transaction.hash);
    } else {
      alert("Fehler beim Kauf: " + result.error);
    }
  } catch (error) {
    console.error("Fehler bei der Transaktion:", error);
    alert("Fehler bei der Transaktion: " + error.message);
  }
}