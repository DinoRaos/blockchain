/**
 * Zeigt eine Bootstrap-Alert-Nachricht an.
 * @param {string} message - Die Nachricht, die angezeigt wird.
 * @param {string} [type="danger"] - Der Typ des Alerts (z.B. "danger", "success", "warning", "info").
 */
 function showAlert(message, type = "danger") {
  const alertContainer = document.getElementById("alertContainer");
  if (alertContainer) {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    setTimeout(() => {
      const alertElement = bootstrap.Alert.getOrCreateInstance(alertContainer.querySelector('.alert'));
      if (alertElement) {
        alertElement.close();
      }
    }, 5000);
  } else {
    console.error("Alert container not found");
  }
}

/**
 * Ermittelt asynchron die Verkäuferadresse eines Artikels anhand der Artikel-ID.
 * @param {number} itemId - Die ID des Artikels.
 * @returns {Promise<string>} - Die Verkäuferadresse.
 * @throws {Error} - Falls keine Verkäuferadresse gefunden wird.
 */
async function getSellerAddress(itemId) {
  const response = await fetch(`/get_seller/${itemId}`);
  const data = await response.json();
  if (data.seller_address) {
    return data.seller_address;
  } else {
    throw new Error("Seller address not found.");
  }
}

/**
 * Lädt asynchron die Konfiguration des Smart Contracts (z.B. Contract-Adresse und ABI) aus einer JSON-Datei.
 * @returns {Promise<Object>} - Das Konfigurationsobjekt.
 * @throws {Error} - Falls die Konfiguration nicht geladen werden kann.
 */
async function loadContractConfig() {
  const response = await fetch("/static/deployedAddress.json");
  if (!response.ok) {
    throw new Error("Konfiguration konnte nicht geladen werden.");
  }
  return response.json();
}

/**
 * Führt den Kaufvorgang über den Smart Contract aus.
 * Verwendet ethers.js, um die Funktion "purchase" des Contracts aufzurufen.
 * @param {string} sellerAddress - Die Adresse des Verkäufers.
 * @param {number|string} priceEth - Der Preis des Artikels in Ether.
 * @returns {Promise<Object>} - Die Transaktionsinformationen.
 * @throws {Error} - Falls kein Ethereum Provider (z.B. MetaMask) gefunden wird.
 */
async function performContractPurchase(sellerAddress, priceEth) {
  if (window.ethereum) {
    const config = await loadContractConfig();
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const marketplace = new ethers.Contract(config.contractAddress, config.abi, signer);

    const tx = await marketplace.purchase(sellerAddress, {
      value: ethers.utils.parseEther(priceEth.toString())
    });
    await tx.wait();
    return tx;
  } else {
    throw new Error("Ethereum provider not found. Please install MetaMask.");
  }
}

/**
 * Führt den gesamten Kaufvorgang eines Artikels aus.
 * Es werden zunächst die Verkäuferadresse abgerufen und anschließend der Kauf über den Smart Contract durchgeführt.
 * Danach wird das Backend über den Kauf informiert.
 * @param {number} itemId - Die ID des zu kaufenden Artikels.
 * @param {number|string} priceEth - Der Preis des Artikels in Ether.
 */
async function buyItem(itemId, priceEth) {
  try {
    const sellerAddress = await getSellerAddress(itemId);
    console.log(`Verkäufer-Adresse: ${sellerAddress}`);

    const transaction = await performContractPurchase(sellerAddress, priceEth);
    console.log("On-Chain Transaktion erfolgreich:", transaction);

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
      showAlert("Kauf erfolgreich!", "success");
    } else {
      showAlert("Fehler beim Kauf: " + result.error, "danger");
    }
  } catch (error) {
    console.error("Fehler bei der Transaktion:", error);
    showAlert("Fehler bei der Transaktion: " + error.message, "danger");
  }
}
