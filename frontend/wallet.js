let provider;
let connectButton;
let walletIcon;

// Persistent state keys
const STATE_KEY = 'walletState';

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
}

async function updateUI(address) {
    connectButton.style.display = 'none';
    
    let addressDisplay = document.getElementById('addressDisplay');
    if (!addressDisplay) {
        addressDisplay = document.createElement('div');
        addressDisplay.id = 'addressDisplay';
        addressDisplay.className = 'ms-2 text-light font-monospace';
        connectButton.parentNode.insertBefore(addressDisplay, connectButton.nextSibling);
    }

    // Fetch ETH balance
    let balance = "0.00";
    if (provider) {
        const balanceWei = await provider.getBalance(address);
        balance = parseFloat(ethers.utils.formatEther(balanceWei)).toFixed(2);
    }

    // Update content with ETH icon
    addressDisplay.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" width="20">
            ${address.slice(0, 6)}...${address.slice(-4)}
        </div>
        <div style="font-size: 0.8rem; color: #fff; text-align: center; display: flex; align-items: center; gap: 4px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ethereum_logo_translucent.svg" width="12">
            ${balance}
        </div>
    `;
}


function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        clearPersistedState();
        window.location.reload();
    }
}

function handleChainChanged() {
    window.location.reload();
}

// Initialize when loaded
initializeWallet();
