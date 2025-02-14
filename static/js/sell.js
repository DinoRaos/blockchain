const ETH_PRICE_CACHE_KEY = "ethPrice";
const CACHE_EXPIRY_TIME = 60000;

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
 * Holt den aktuellen ETH-Preis (in EUR) und nutzt dabei einen Cache, um API-Anfragen zu minimieren.
 * @returns {Promise<number|null>} - Den aktuellen ETH-Preis in EUR oder null, falls ein Fehler auftritt.
 */
async function fetchEthPrice() {
  const cachedPrice = localStorage.getItem(ETH_PRICE_CACHE_KEY);
  const cacheTimestamp = localStorage.getItem(ETH_PRICE_CACHE_KEY + "_timestamp");

  if (cachedPrice && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_EXPIRY_TIME) {
    console.log("Using cached ETH price:", cachedPrice);
    return parseFloat(cachedPrice);
  }

  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur");

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.ethereum && data.ethereum.eur) {
      const ethPrice = parseFloat(data.ethereum.eur);

      localStorage.setItem(ETH_PRICE_CACHE_KEY, ethPrice);
      localStorage.setItem(ETH_PRICE_CACHE_KEY + "_timestamp", Date.now());

      return ethPrice;
    }
  } catch (error) {
    console.error("Failed to fetch ETH price:", error);
    return null;
  }
}

/**
 * Konvertiert den eingegebenen ETH-Betrag in einen ungefähren EUR-Betrag und zeigt diesen an.
 */
async function convertEthToFiat() {
  const ethInput = document.getElementById("itemPrice").value;
  const ethToFiatDisplay = document.getElementById("ethToFiat");
  const alertBox = document.getElementById("ethToFiatContainer");

  if (!ethInput || ethInput <= 0) {
    ethToFiatDisplay.innerText = "~ 0.00 EUR";
    alertBox.style.display = "none";
    return;
  }

  const ethPrice = await fetchEthPrice();
  if (ethPrice !== null) {
    const convertedPrice = (ethInput * ethPrice).toFixed(2);
    ethToFiatDisplay.innerText = `~ ${convertedPrice} EUR`;
    alertBox.style.display = "block";
  } else {
    ethToFiatDisplay.innerText = "~ API Offline";
    alertBox.style.display = "block";
  }
}

/**
 * Ruft die MetaMask-Adresse des aktuellen Nutzers ab.
 * @returns {Promise<string|null>} - Die Adresse oder null, falls ein Fehler auftritt.
 */
async function getMetaMaskAddress() {
  if (typeof window.ethereum !== "undefined") {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    try {
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      return address;
    } catch (error) {
      console.error("MetaMask-Adresse konnte nicht abgerufen werden:", error);
      return null;
    }
  } else {
    showAlert("MetaMask ist nicht installiert.", "danger");
    return null;
  }
}

/**
 * Fügt einen Submit-Event-Listener zum Verkaufsformular hinzu.
 * Bei erfolgreicher Verbindung mit MetaMask wird die Verkäuferadresse gesetzt und das Formular abgeschickt.
 */
document.getElementById("sellForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const address = await getMetaMaskAddress();
  if (address) {
    document.getElementById("sellerAddress").value = address;
    this.submit();
  } else {
    showAlert("Bitte verbinden Sie sich mit MetaMask, um fortzufahren.", "warning");
  }
});

/**
 * Fügt einen Change-Event-Listener zum Dateieingabefeld hinzu, um eine Bildvorschau anzuzeigen.
 */
document.getElementById("itemImage").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("imagePreview").src = e.target.result;
      document.getElementById("imagePreviewContainer").classList.remove("d-none");
    };
    reader.readAsDataURL(file);
  }
});

/**
 * Initialisiert UI-Komponenten, sobald das DOM geladen ist, und startet den Abruf des ETH-Preises.
 */
document.addEventListener("DOMContentLoaded", function () {
  new bootstrap.Tooltip(document.getElementById("ethInfoBtn"));
  fetchEthPrice();
});

/**
 * Fügt einen Input-Event-Listener zum Preisfeld hinzu, um den ETH-Preis in EUR umzurechnen.
 */
document.getElementById("itemPrice").addEventListener("input", convertEthToFiat);
