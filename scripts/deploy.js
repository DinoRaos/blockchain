const fs = require("fs");
const path = require("path");

// Importiere das Artifakt des MarketplacePayment Contracts
const MarketplacePaymentArtifact = require("../artifacts/contracts/MarketplacePayment.sol/MarketplacePayment.json");

async function main() {
  console.log("Deploying MarketplacePayment...");

  // Hole die Contract Factory für MarketplacePayment
  const MarketplacePayment = await ethers.getContractFactory("MarketplacePayment");

  // Deploye den Contract
  const marketplacePayment = await MarketplacePayment.deploy();

  // Warte, bis der Contract deployed ist
  await marketplacePayment.deployed();

  console.log("MarketplacePayment deployed to:", marketplacePayment.address);

  // Erstelle ein Konfigurationsobjekt mit Adresse und ABI
  const config = {
    contractAddress: marketplacePayment.address,
    abi: MarketplacePaymentArtifact.abi,
  };

  // Schreibe die Konfiguration in den static-Ordner, damit dein Frontend sie laden kann
  const configPath = path.join(__dirname, "..", "static", "deployedAddress.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log("Contract address and ABI written to static/deployedAddress.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
