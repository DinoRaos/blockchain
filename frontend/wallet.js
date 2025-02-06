let provider;
let connectButton;
let walletIcon;

// Persistent state keys
const STATE_KEY = 'walletState';
const CONNECTED_KEY = 'isConnected';

function initializeWallet() {
    connectButton = document.getElementById('connectButton');
    walletIcon = document.getElementById('walletIcon');

    if (!connectButton || !walletIcon) {
        setTimeout(initializeWallet, 100);
        return;
    }

    // Clear existing listeners
    const newButton = connectButton.cloneNode(true);
    connectButton.parentNode.replaceChild(newButton, connectButton);
    connectButton = newButton;

    // Set up listeners
    connectButton.addEventListener('click', connectWallet);
    
    // Check initial state
    checkPersistedState();
    
    // Set up Ethereum listeners
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }
}

async function checkPersistedState() {
    try {
        const savedState = localStorage.getItem(STATE_KEY);
        if (savedState) {
            const { isConnected, address } = JSON.parse(savedState);
            if (isConnected && address) {
                await verifyConnection(address);
            }
        }
    } catch (error) {
        console.error('State restoration failed:', error);
        clearPersistedState();
    }
}

async function verifyConnection(expectedAddress) {
    if (window.ethereum?.isConnected()) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const actualAddress = await signer.getAddress();
        
        if (actualAddress.toLowerCase() === expectedAddress.toLowerCase()) {
            updateUI(actualAddress);
            return true;
        }
    }
    clearPersistedState();
    return false;
}

async function connectWallet() {
    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        persistState(address);
        updateUI(address);
        
    } catch (error) {
        console.error('Connection failed:', error);
        alert(`Connection error: ${error.message || error}`);
        clearPersistedState();
    }
}

function persistState(address) {
    const state = {
        isConnected: true,
        address: address.toLowerCase(),
        timestamp: Date.now()
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function clearPersistedState() {
    localStorage.removeItem(STATE_KEY);
    window.location.reload();
}

function updateUI(address) {
    connectButton.style.display = 'none';
    walletIcon.textContent = '✅';

    // Create or update UI elements
    let addressDisplay = document.getElementById('addressDisplay');
    if (!addressDisplay) {
        addressDisplay = document.createElement('span');
        addressDisplay.id = 'addressDisplay';
        addressDisplay.className = 'ms-2 text-light';
        connectButton.parentNode.insertBefore(addressDisplay, connectButton.nextSibling);
    }
    addressDisplay.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;

    let disconnectButton = document.getElementById('disconnectButton');
    if (!disconnectButton) {
        disconnectButton = document.createElement('button');
        disconnectButton.id = 'disconnectButton';
        disconnectButton.className = 'btn btn-danger ms-2';
        disconnectButton.textContent = 'Disconnect';
        addressDisplay.insertAdjacentElement('afterend', disconnectButton);
        disconnectButton.addEventListener('click', disconnectWallet);
    }
}

function disconnectWallet() {
    connectButton.style.display = 'block';
    walletIcon.textContent = '🔒';
    document.getElementById('addressDisplay')?.remove();
    document.getElementById('disconnectButton')?.remove();
    clearPersistedState();
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else {
        const savedState = JSON.parse(localStorage.getItem(STATE_KEY));
        if (savedState?.address !== accounts[0].toLowerCase()) {
            disconnectWallet();
        }
    }
}

function handleChainChanged() {
    window.location.reload();
}

// Initialize when loaded
initializeWallet();