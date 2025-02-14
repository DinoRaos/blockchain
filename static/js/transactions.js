document.addEventListener("DOMContentLoaded", async () => {
  const transactionButton = document.getElementById("transactionButton");

  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        const checksummedAddress = ethers.utils.getAddress(accounts[0]);
        console.log("MetaMask ist bereits verbunden:", checksummedAddress);
        transactionButton.classList.remove("d-none");

        fetchTransactions(checksummedAddress);
      } else {
        console.log("MetaMask nicht verbunden.");
        transactionButton.classList.add("d-none");
      }
    } catch (err) {
      console.error("Fehler beim Prüfen der MetaMask Verbindung:", err);
    }
  }

  transactionButton.addEventListener("click", async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        const checksummedAddress = ethers.utils.getAddress(accounts[0]);
        fetchTransactions(checksummedAddress);
      }
    }
  });
});


async function fetchTransactions(userAddress) {
  const payload = { user_address: userAddress };
  console.log("Sending payload to /api/transactions:", payload);

  try {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Fehler beim Abrufen der Transaktionen");

    const transactions = await response.json();
    renderTransactionList(transactions);
  } catch (error) {
    console.error(error);
    document.getElementById("transactionList").innerHTML =
      "<p class='text-center text-danger'>Fehler beim Laden.</p>";
  }
}


function renderTransactionList(transactions) {
  const transactionList = document.getElementById("transactionList");
  transactionList.innerHTML = "";

  if (transactions.length === 0) {
    transactionList.innerHTML = "<p class='text-center'>Keine Transaktionen gefunden.</p>";
    return;
  }

  transactions.forEach((tx) => {
    const listItem = document.createElement("button");
    listItem.classList.add(
      "list-group-item",
      "list-group-item-action",
      "d-flex",
      "align-items-center"
    );
    listItem.innerHTML = `<i class="bi bi-box-seam me-2"></i> <strong>${tx.item_name}</strong>`;
    listItem.addEventListener("click", () => showTransactionDetails(tx));

    transactionList.appendChild(listItem);
  });
}

function showTransactionDetails(transaction) {
  const itemNameElem = document.getElementById("transactionItemName");
  const sellerElem = document.getElementById("transactionSeller");
  const dateElem = document.getElementById("transactionDate");
  const priceElem = document.getElementById("transactionPrice");
  const imageElem = document.getElementById("transactionImage");

  if (!itemNameElem || !sellerElem || !dateElem || !priceElem || !imageElem) {
    console.error("Ein oder mehrere Elemente wurden nicht gefunden.");
    return;
  }

  itemNameElem.innerText = transaction.item_name;
  sellerElem.innerText = transaction.seller_address;
  dateElem.innerText = transaction.date;
  priceElem.innerText = transaction.price_eth;
  imageElem.src = transaction.image_url;

  document.getElementById("transactionDetails").classList.remove("d-none");
}
