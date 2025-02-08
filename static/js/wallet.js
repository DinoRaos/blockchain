let provider;
let connectButton;
let walletIcon;

// Persistent state keys
const STATE_KEY = "walletState";

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    clearPersistedState();
    updateUI(null);
    window.location.reload();
  } else {
    const newAddress = accounts[0];
    persistState(newAddress);
    updateUI(newAddress);
  }
}

async function initializeWallet() {
  connectButton = document.getElementById("connectButton");
  walletIcon = document.getElementById("walletIcon");

  if (!connectButton || !walletIcon) {
    setTimeout(initializeWallet, 100);
    return;
  }

  // Clear existing listeners
  const newButton = connectButton.cloneNode(true);
  connectButton.parentNode.replaceChild(newButton, connectButton);
  connectButton = newButton;

  // Set up listeners
  connectButton.addEventListener("click", connectWallet);

  // Check initial state and restore connection
  await checkPersistedState();

  // Set up Ethereum listeners
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
  }
}

async function checkPersistedState() {
  try {
    const savedState = localStorage.getItem(STATE_KEY);
    if (savedState) {
      const { isConnected, address } = JSON.parse(savedState);
      if (isConnected && address) {
        // Versuchen Sie, die Wallet-Adresse abzurufen, ohne den Benutzer erneut zu fragen
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0 && accounts[0].toLowerCase() === address.toLowerCase()) {
          // Verbindung erfolgreich wiederhergestellt
          provider = new ethers.providers.Web3Provider(window.ethereum);
          updateUI(address);
        } else {
          // Keine Verbindung möglich, Zustand löschen
          clearPersistedState();
        }
      }
    }
  } catch (error) {
    console.error("State restoration failed:", error);
    clearPersistedState();
  }
}

async function connectWallet() {
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    persistState(address);
    updateUI(address);
  } catch (error) {
    console.error("Connection failed:", error);
    alert(`Connection error: ${error.message || error}`);
    clearPersistedState();
  }
}

function persistState(address) {
  const state = {
    isConnected: true,
    address: address.toLowerCase(),
    timestamp: Date.now(),
  };
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function clearPersistedState() {
  localStorage.removeItem(STATE_KEY); // Zustand aus dem LocalStorage löschen
  updateUI(null);
}

async function updateUI(address) {
  let addressDisplay = document.getElementById("addressDisplay");

  if (address) {
    // Wallet ist verbunden: Adresse und ETH-Saldo anzeigen
    if (!addressDisplay) {
      addressDisplay = document.createElement("div");
      addressDisplay.id = "addressDisplay";
      addressDisplay.className = "ms-2 text-light font-monospace";
      if (connectButton && connectButton.parentNode) {
        connectButton.parentNode.insertBefore(
          addressDisplay,
          connectButton.nextSibling
        );
      }
    }

    let balance = "0.00";
    if (provider) {
      const balanceWei = await provider.getBalance(address);
      balance = parseFloat(ethers.utils.formatEther(balanceWei)).toFixed(2);
    }

    const displayBalance = balance === "0.00" || balance === 0 ? "0" : balance;

    console.log('Address:', address);
    console.log('Balance:', displayBalance);

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

    if (connectButton) {
      connectButton.style.display = "none";
    }
  } else {
    if (connectButton) {
      connectButton.style.display = "block";
    }

    if (addressDisplay) {
      addressDisplay.style.display = "none";
    }
  }
}

// Initialize when loaded
initializeWallet();