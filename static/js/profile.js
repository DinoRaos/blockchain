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

let currentUserAddress = null;
let salesDataGlobal = [];
let editModalInstance = null;

const ETH_PRICE_CACHE_KEY = "ethPrice";
const CACHE_EXPIRY_TIME = 60000;

/**
 * Holt den aktuellen ETH-Preis (in EUR) und nutzt dabei einen Cache, um unnötige API-Anfragen zu vermeiden.
 * @returns {Promise<number|null>} - Der aktuelle ETH-Preis in EUR oder null, falls ein Fehler auftritt.
 */
async function fetchEthPrice() {
  const cachedPrice = localStorage.getItem(ETH_PRICE_CACHE_KEY);
  const cacheTimestamp = localStorage.getItem(ETH_PRICE_CACHE_KEY + "_timestamp");

  if (cachedPrice && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_EXPIRY_TIME) {
    console.log("Using cached ETH price:", cachedPrice);
    return parseFloat(cachedPrice);
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur"
    );
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
async function convertEthToFiatProfile() {
  const ethInput = document.getElementById("editItemPrice").value;
  const ethToFiatDisplay = document.getElementById("editEthToFiat");
  const alertBox = document.getElementById("editEthToFiatContainer");

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
 * Wird ausgeführt, sobald das DOM geladen ist.
 * Fordert MetaMask zur Verbindung auf, holt das Nutzerprofil und initialisiert diverse UI-Komponenten.
 */
document.addEventListener("DOMContentLoaded", async () => {
  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      currentUserAddress = await signer.getAddress();

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_address: currentUserAddress }),
      });
      if (!response.ok) {
        throw new Error("Fehler beim Abrufen der Profildaten");
      }
      const data = await response.json();
      salesDataGlobal = data.sales;
      renderProfile(data);

      editModalInstance = new bootstrap.Modal(document.getElementById("editModal"));

      document.getElementById("deleteItemBtn").addEventListener("click", handleDelete);

      const infoBtn = document.getElementById("editEthInfoBtn");
      if (infoBtn) {
        new bootstrap.Tooltip(infoBtn);
      }

      const editPriceInput = document.getElementById("editItemPrice");
      if (editPriceInput) {
        editPriceInput.addEventListener("input", convertEthToFiatProfile);
      }

      fetchEthPrice();
    } catch (err) {
      console.error("Fehler:", err);
      document.getElementById("profileContainer").innerHTML =
        `<div class="alert alert-danger" role="alert">Fehler beim Laden des Profils.</div>`;
    }
  } else {
    showAlert("Kein Ethereum-Provider gefunden. Bitte installiere MetaMask.", "danger");
  }
});

/**
 * Rendert das Profil des Nutzers, indem es Verkäufe und Käufe in HTML darstellt.
 * @param {Object} data - Das Profilobjekt mit den Arrays "sales" und "purchases".
 */
function renderProfile(data) {
  let salesHTML = data.sales
    .map((sale, index) => {
      return `
        <div class="accordion-item">
          <h2 class="accordion-header">
            <button
              class="accordion-button d-flex justify-content-between align-items-center"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#saleCollapse${index}"
            >
              <span>
                ${sale.name}
                ${sale.status === "available"
          ? `<i class="bi bi-pencil-square edit-icon ms-2" style="cursor: pointer;" onclick="openEditModal(${sale.id})"></i>`
          : ``
        }
              </span>
              ${sale.status === "sold"
          ? '<span class="badge bg-danger ms-2">Verkauft</span>'
          : '<span class="badge bg-success ms-2">Verfügbar</span>'
        }
            </button>
          </h2>
          <div id="saleCollapse${index}" class="accordion-collapse collapse">
            <div class="accordion-body">
              <div class="row">
                <div class="col-md-4">
                  <img src="${sale.image_url}" class="img-fluid" alt="${sale.name}" />
                </div>
                <div class="col-md-8">
                  <h5>${sale.name}</h5>
                  <p class="card-text" id="descTextSale${index}" data-expanded="false" data-fulltext='${JSON.stringify(sale.description)}'>
                    ${sale.description.length > 100
          ? sale.description.slice(0, 100) + "..."
          : sale.description
        }
                  </p>
                  ${sale.description.length > 100
          ? `<button class="btn btn-outline-secondary btn-sm mt-2 d-flex align-items-center gap-1" type="button" onclick="toggleDescription('descTextSale${index}', this)"><i class="bi bi-chevron-down"></i> Mehr anzeigen</button>`
          : ""
        }
                  <div class="d-flex align-items-center mt-3">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ethereum_logo_translucent.svg" alt="ETH" class="eth-icon me-2" width="16" />
                    <span class="fw-bold">${sale.price_eth} ETH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  let purchasesHTML = data.purchases
    .map((purchase, index) => {
      return `
        <div class="accordion-item">
          <h2 class="accordion-header">
            <button class="accordion-button d-flex justify-content-between align-items-center" type="button" data-bs-toggle="collapse" data-bs-target="#purchaseCollapse${index}">
              <span>${purchase.name}</span>
            </button>
          </h2>
          <div id="purchaseCollapse${index}" class="accordion-collapse collapse">
            <div class="accordion-body">
              <div class="row">
                <div class="col-md-4">
                  <img src="${purchase.image_url}" class="img-fluid" alt="${purchase.name}" />
                </div>
                <div class="col-md-8">
                  <h5>${purchase.name}</h5>
                  <p class="card-text" id="descTextPurchase${index}" data-expanded="false" data-fulltext='${JSON.stringify(purchase.description)}'>
                    ${purchase.description.length > 100
          ? purchase.description.slice(0, 100) + "..."
          : purchase.description
        }
                  </p>
                  ${purchase.description.length > 100
          ? `<button class="btn btn-outline-secondary btn-sm mt-2 d-flex align-items-center gap-1" type="button" onclick="toggleDescription('descTextPurchase${index}', this)"><i class="bi bi-chevron-down"></i> Mehr anzeigen</button>`
          : ""
        }
                  <div class="d-flex align-items-center mt-3">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/01/Ethereum_logo_translucent.svg" alt="ETH" class="eth-icon me-2" width="16" />
                    <span class="fw-bold">${purchase.price_eth} ETH</span>
                  </div>
                  <div class="seller-info">
                    <i class="bi bi-person-circle seller-icon"></i>
                    <span class="seller-address">${purchase.seller_address}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  document.getElementById("profileContainer").innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <h4>Verkäufe</h4>
        <div class="accordion" id="salesAccordion">
          ${salesHTML}
        </div>
      </div>
      <div class="col-md-6">
        <h4>Käufe</h4>
        <div class="accordion" id="purchasesAccordion">
          ${purchasesHTML}
        </div>
      </div>
    </div>
  `;
}

/**
 * Öffnet ein Modal zum Bearbeiten eines Verkaufsartikels.
 * Füllt die Formularfelder mit den aktuellen Daten des Artikels.
 * @param {number} itemId - Die ID des Artikels, der bearbeitet werden soll.
 */
function openEditModal(itemId) {
  const item = salesDataGlobal.find((sale) => sale.id === itemId);
  if (!item) return;

  document.getElementById("editItemId").value = item.id;
  document.getElementById("editItemName").value = item.name;
  document.getElementById("editItemDescription").value = item.description;
  document.getElementById("editItemPrice").value = item.price_eth;
  document.getElementById("editSellerAddress").value = item.seller_address;

  const previewContainer = document.getElementById("editImagePreviewContainer");
  const previewImg = document.getElementById("editImagePreview");
  if (item.image_url) {
    previewImg.src = item.image_url;
    previewContainer.classList.remove("d-none");
  } else {
    previewContainer.classList.add("d-none");
  }

  editModalInstance.show();
}

/**
 * Aktualisiert die Bildvorschau, wenn ein neues Bild im Bearbeitungsformular ausgewählt wird.
 */
document.getElementById("editItemImage").addEventListener("change", (evt) => {
  const file = evt.target.files[0];
  if (!file) return;
  const previewContainer = document.getElementById("editImagePreviewContainer");
  const previewImg = document.getElementById("editImagePreview");
  previewImg.src = URL.createObjectURL(file);
  previewContainer.classList.remove("d-none");
});

/**
 * Behandelt das Absenden des Bearbeitungsformulars für einen Artikel.
 * Sendet die aktualisierten Daten (inklusive eines optionalen neuen Bildes) an das Backend.
 */
document.getElementById("editItemForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const formData = new FormData(this);
  formData.append("userAddress", currentUserAddress);

  const itemId = formData.get("itemId");

  try {
    const resp = await fetch(`/api/item/${itemId}/update`, {
      method: "POST",
      body: formData,
    });

    if (!resp.ok) {
      const errData = await resp.json();
      showAlert("Fehler: " + (errData.error || "Unbekannter Fehler"), "danger");
      return;
    }

    const data = await resp.json();
    console.log(data.message);
    editModalInstance.hide();
    location.reload();
  } catch (error) {
    console.error(error);
    showAlert("Fehler beim Speichern: " + error.message, "danger");
  }
});

/**
 * Behandelt das Löschen eines Artikels.
 * Fragt eine Bestätigung vom Nutzer an und sendet dann eine DELETE-Anfrage an das Backend.
 */
async function handleDelete() {
  if (!confirm("Willst du diesen Artikel wirklich löschen?")) return;

  const itemId = document.getElementById("editItemId").value;
  try {
    const resp = await fetch(`/api/item/${itemId}/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_address: currentUserAddress }),
    });

    if (!resp.ok) {
      const errData = await resp.json();
      showAlert("Fehler: " + (errData.error || "Unbekannter Fehler"), "danger");
      return;
    }

    const data = await resp.json();
    console.log(data.message);
    editModalInstance.hide();
    location.reload();
  } catch (error) {
    console.error(error);
    showAlert("Fehler beim Löschen: " + error.message, "danger");
  }
}

/**
 * Wechselt zwischen verkürzter und vollständiger Anzeige der Artikelbeschreibung.
 * @param {string} elementId - Die ID des Elements, das die Beschreibung enthält.
 * @param {HTMLElement} button - Der Button, der den Toggle auslöst.
 */
function toggleDescription(elementId, button) {
  const descElem = document.getElementById(elementId);
  const fullText = JSON.parse(descElem.getAttribute("data-fulltext"));

  if (descElem.getAttribute("data-expanded") === "false") {
    descElem.innerHTML = fullText;
    descElem.setAttribute("data-expanded", "true");
    button.innerHTML = '<i class="bi bi-chevron-up"></i> Weniger anzeigen';
  } else {
    const truncatedText = fullText.substring(0, 100);
    descElem.innerHTML = truncatedText + "...";
    descElem.setAttribute("data-expanded", "false");
    button.innerHTML = '<i class="bi bi-chevron-down"></i> Mehr anzeigen';
  }
}

/**
 * Verbirgt den Lade-Spinner, sobald das DOM vollständig geladen ist.
 */
document.addEventListener("DOMContentLoaded", () => {
  const loadingSpinner = document.getElementById("loadingSpinner");
  if (loadingSpinner) {
    loadingSpinner.style.display = "none";
  }
});
