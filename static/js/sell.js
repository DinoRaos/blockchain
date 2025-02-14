const ETH_PRICE_CACHE_KEY = "ethPrice";
const CACHE_EXPIRY_TIME = 60000;

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
    alert("MetaMask ist nicht installiert.");
    return null;
  }
}

document.getElementById("sellForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const address = await getMetaMaskAddress();
  if (address) {
    document.getElementById("sellerAddress").value = address;
    this.submit();
  } else {
    alert("Bitte verbinden Sie sich mit MetaMask, um fortzufahren.");
  }
});

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

document.addEventListener("DOMContentLoaded", function () {
  new bootstrap.Tooltip(document.getElementById("ethInfoBtn"));
  fetchEthPrice();
});

document.getElementById("itemPrice").addEventListener("input", convertEthToFiat);
