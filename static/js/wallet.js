let provider;
let connectButton;
let walletIcon;
const STATE_KEY = "walletState";

/**
 * Behandelt Änderungen der Konten in MetaMask.
 * Aktualisiert den persistierten Zustand und die UI, wenn sich die Konten ändern.
 * @param {Array<string>} accounts - Array der aktuellen Adressen.
 */
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    clearPersistedState();
    updateUI(null);
    window.location.reload();
  } else {
    const newAddress = ethers.utils.getAddress(accounts[0]);
    persistState(newAddress);
    updateUI(newAddress);
    window.location.reload();
  }
}

/**
 * Initialisiert die Wallet-Funktionalität.
 * Fügt Event-Listener hinzu und prüft, ob bereits ein Zustand persistiert wurde.
 */
async function initializeWallet() {
  connectButton = document.getElementById("connectButton");
  walletIcon = document.getElementById("walletIcon");

  if (!connectButton || !walletIcon) {
    setTimeout(initializeWallet, 100);
    return;
  }

  connectButton.hidden = true;

  connectButton.removeEventListener("click", connectWallet);
  connectButton.addEventListener("click", connectWallet);

  await checkPersistedState();

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
  }
}

/**
 * Überprüft, ob ein Zustand (Wallet-Verbindung) im Local Storage vorhanden ist.
 * Falls ja, wird der Zustand wiederhergestellt und die UI entsprechend aktualisiert.
 */
async function checkPersistedState() {
  try {
    const savedState = localStorage.getItem(STATE_KEY);
    if (savedState) {
      const { isConnected, address } = JSON.parse(savedState);
      if (isConnected && address) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (
          accounts.length > 0 &&
          ethers.utils.getAddress(accounts[0]) === ethers.utils.getAddress(address)
        ) {
          provider = new ethers.providers.Web3Provider(window.ethereum);
          updateUI(address);
          return;
        }
      }
    }
    connectButton.hidden = false;
  } catch (error) {
    console.error("State restoration failed:", error);
    clearPersistedState();
    connectButton.hidden = false;
  }
}

/**
 * Verbindet die Wallet (MetaMask) des Nutzers.
 * Fordert den Nutzer auf, seine Konten freizugeben, und aktualisiert anschließend die UI.
 */
async function connectWallet() {
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = ethers.utils.getAddress(await signer.getAddress());
    console.log("Current user address (checksummed):", address);

    persistState(address);
    updateUI(address);
  } catch (error) {
    console.error("Verbindungsfehler:", error);
    showAlert(`Verbindungsfehler: ${error.message || error}`);
    clearPersistedState();
  }
}

/**
 * Speichert den aktuellen Wallet-Zustand im Local Storage.
 * @param {string} address - Die Wallet-Adresse des Nutzers.
 */
function persistState(address) {
  const state = {
    isConnected: true,
    address: address,
    timestamp: Date.now(),
  };
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/**
 * Löscht den persistierten Wallet-Zustand aus dem Local Storage und aktualisiert die UI.
 */
function clearPersistedState() {
  localStorage.removeItem(STATE_KEY);
  updateUI(null);
}

/**
 * Aktualisiert die Benutzeroberfläche basierend auf dem aktuellen Wallet-Zustand.
 * Zeigt die verkürzte Adresse und den Kontostand an.
 * @param {string|null} address - Die Wallet-Adresse oder null, wenn nicht verbunden.
 */
async function updateUI(address) {
  let addressDisplay = document.getElementById("addressDisplay");

  if (address) {
    if (!addressDisplay) {
      addressDisplay = document.createElement("div");
      addressDisplay.id = "addressDisplay";
      addressDisplay.className = "ms-2 text-light font-monospace";
      if (connectButton.parentNode) {
        connectButton.parentNode.insertBefore(addressDisplay, connectButton.nextSibling);
      }
    }

    let balance = "0.00";
    if (provider) {
      const balanceWei = await provider.getBalance(address);
      balance = parseFloat(ethers.utils.formatEther(balanceWei)).toFixed(2);
    }

    const displayBalance = balance === "0.00" || balance === 0 ? "0" : balance;

    addressDisplay.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" width="20">
        ${address.slice(0, 6)}...${address.slice(-4)}
      </div>
      <div style="font-size: 0.8rem; color: #fff; text-align: center; display: flex; align-items: center; gap: 4px;">
        <img src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ethereum_logo_translucent.svg" width="12">
        ${displayBalance}
      </div>
    `;

    connectButton.hidden = true;
  } else {
    connectButton.hidden = false;
    if (addressDisplay) {
      addressDisplay.style.display = "none";
    }
  }
}

/**
 * Wird aufgerufen, wenn die Blockchain (Netzwerk) gewechselt wird.
 * Aktualisiert die Seite.
 * @param {string} chainId - Die neue Chain-ID.
 */
function handleChainChanged(chainId) {
  console.log("Network changed to:", chainId);
  window.location.reload();
}

// Initialisiere die Wallet-Funktionalität
initializeWallet();
