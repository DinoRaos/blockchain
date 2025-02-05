let provider;
let signer;
let marketplaceContract;
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const contractABI = [
  "function listItem(string memory _name, uint _price) public",
  "function buyItem(uint _id) public payable"
];

window.addEventListener('load', async () => {
  if (typeof window.ethereum !== 'undefined') {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    document.getElementById('connectWalletBtn').disabled = false;
    checkConnection();
  } else {
    alert("Bitte installieren Sie MetaMask!");
  }
});

async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      document.getElementById('connectWalletBtn').innerText = "Wallet verbunden";
      marketplaceContract = new ethers.Contract(contractAddress, contractABI, signer);
    } catch (error) {
      console.error("Fehler beim Verbinden der Wallet:", error);
      alert("Fehler beim Verbinden der Wallet.");
    }
  } else {
    alert("MetaMask ist nicht installiert!");
  }
}

async function checkConnection() {
  const accounts = await provider.listAccounts();
  if (accounts.length > 0) {
    document.getElementById('connectWalletBtn').innerText = "Wallet verbunden";
  }
}

document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);