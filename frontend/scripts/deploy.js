const fs = require("fs");

const path = "./src/landing_page/Shipment/contractAddress.json";

async function main() {

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);

  /* ------------------------------------------------ */
  /* 1️⃣ Deploy NirvanaToken                           */
  /* ------------------------------------------------ */

  console.log("Deploying NirvanaToken...");

  const initialSupply = 1000000;

  const NirvanaToken = await ethers.getContractFactory("NirvanaToken");

  const nirvanaToken = await NirvanaToken.deploy(initialSupply);

  await nirvanaToken.waitForDeployment();

  const tokenAddress = await nirvanaToken.getAddress();

  console.log("NirvanaToken deployed at:", tokenAddress);

  /* ------------------------------------------------ */
  /* 2️⃣ Add deployer to whitelist                     */
  /* ------------------------------------------------ */

  console.log("Whitelisting deployer...");

  await (await nirvanaToken.addToWhitelist(deployer.address)).wait();

  /* ------------------------------------------------ */
  /* 3️⃣ Deploy Registry Contract                      */
  /* ------------------------------------------------ */

  console.log("Deploying CardTransactionRegistry...");

  const CardTransactionRegistry = await ethers.getContractFactory("CardTransactionRegistry");

  const feeCollector = deployer.address;

  const cardTransactionRegistry = await CardTransactionRegistry.deploy(
    tokenAddress,
    feeCollector
  );

  await cardTransactionRegistry.waitForDeployment();

  const registryAddress = await cardTransactionRegistry.getAddress();

  console.log("CardTransactionRegistry deployed at:", registryAddress);

  /* ------------------------------------------------ */
  /* 4️⃣ Whitelist Registry Contract                   */
  /* ------------------------------------------------ */

  console.log("Whitelisting registry contract...");

  await (await nirvanaToken.addToWhitelist(registryAddress)).wait();

  /* ------------------------------------------------ */
  /* 5️⃣ Save addresses for frontend                   */
  /* ------------------------------------------------ */

  const contractData = {
    registryAddress: registryAddress,
    tokenAddress: tokenAddress
  };

  fs.writeFileSync(path, JSON.stringify(contractData, null, 2));

  console.log("Contract addresses saved to:", path);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });