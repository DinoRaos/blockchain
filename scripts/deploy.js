const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying Marketplace...");

  // Hole die Contract Factory
  const Marketplace = await ethers.getContractFactory("Marketplace");

  // Deploye den Contract
  const marketplace = await Marketplace.deploy();

  // Warte, bis der Contract deployed ist
  await marketplace.deployed();

  console.log("Marketplace deployed to:", marketplace.address);

  // Erstelle ein Konfigurationsobjekt
  const config = {
    contractAddress: marketplace.address
  };

  // Schreibe die Konfiguration in eine Datei (z. B. in den übergeordneten Ordner, wo auch dein Frontend darauf zugreifen kann)
  const configPath = path.join(__dirname, "..", "deployedAddress.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log("Contract address written to deployedAddress.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
