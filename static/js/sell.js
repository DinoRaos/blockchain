async function getMetaMaskAddress() {
  if (typeof window.ethereum !== "undefined") {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    try {
      // Fordere den Benutzer auf, MetaMask zu verbinden
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      return address; // Gib die Adresse zurück
    } catch (error) {
      console.error("MetaMask-Adresse konnte nicht abgerufen werden:", error);
      return null;
    }
  } else {
    alert("MetaMask ist nicht installiert.");
    return null;
  }
}

document
  .getElementById("sellForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    // Hole die MetaMask-Adresse
    const address = await getMetaMaskAddress();
    if (address) {
      // Setze die Adresse in das versteckte Formularfeld
      document.getElementById("sellerAddress").value = address;

      // Sende das Formular manuell ab
      this.submit();
    } else {
      alert("Bitte verbinden Sie sich mit MetaMask, um fortzufahren.");
    }
  });
