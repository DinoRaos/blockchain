// buy_transaction.js

// Funktion, um die Verkäuferadresse aus deiner DB abzurufen
async function getSellerAddress(itemId) {
  const response = await fetch(`/get_seller/${itemId}`);
  const data = await response.json();
  if (data.seller_address) {
    return data.seller_address;
  } else {
    throw new Error("Seller address not found.");
  }
}

// Lädt die Contract-Konfiguration (Adresse und ABI) aus der Datei im static-Ordner
async function loadContractConfig() {
  const response = await fetch("/static/deployedAddress.json");
  if (!response.ok) {
    throw new Error("Konfiguration konnte nicht geladen werden.");
  }
  return response.json();
}

// Führt den Kauf über den Smart Contract als Zahlungsabwickler aus
async function performContractPurchase(sellerAddress, priceEth) {
  if (window.ethereum) {
    const config = await loadContractConfig(); // Muss die Konfiguration des neuen Contracts enthalten
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const marketplace = new ethers.Contract(config.contractAddress, config.abi, signer);

    // Rufe die purchase-Funktion des Contracts auf und übergebe den Verkäufer sowie den Betrag (in wei)
    const tx = await marketplace.purchase(sellerAddress, {
      value: ethers.utils.parseEther(priceEth.toString())
    });
    await tx.wait();
    return tx;
  } else {
    throw new Error("Ethereum provider not found. Please install MetaMask.");
  }
}

// Hauptfunktion, die den Kauf auslöst
async function buyItem(itemId, priceEth) {
  try {
    // Hole die Verkäuferadresse aus deiner Datenbank (Off-Chain)
    const sellerAddress = await getSellerAddress(itemId);
    console.log(`Verkäufer-Adresse: ${sellerAddress}`);

    // Führe den Kauf über den Smart Contract (On-Chain) durch
    const transaction = await performContractPurchase(sellerAddress, priceEth);
    console.log("On-Chain Transaktion erfolgreich:", transaction);

    // Aktualisiere den DB-Status via dein Backend (Off-Chain)
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const buyerAddress = await signer.getAddress();
    const response = await fetch(`/buy/offer/${itemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyer_address: buyerAddress }),
    });
    const result = await response.json();
    if (response.ok) {
      alert("Kauf erfolgreich!");
    } else {
      alert("Fehler beim Kauf: " + result.error);
    }
  } catch (error) {
    console.error("Fehler bei der Transaktion:", error);
    alert("Fehler bei der Transaktion: " + error.message);
  }
}
