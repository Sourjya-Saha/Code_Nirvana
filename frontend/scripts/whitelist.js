const { ethers } = require("hardhat");

async function main() {
  const addressToWhitelist = "0x632de8AD2299621F01bdF470399762d0064544A6"; // Replace with the address to whitelist
  
  // Get the contract instance
  const NirvanaToken = await ethers.getContractFactory("NirvanaToken");
  const token = await NirvanaToken.attach("0x1786eB32d0B35dbeCb80D168625Df78785f79811");
  
  console.log("Whitelisting address:", addressToWhitelist);
  
  // Add the address to the whitelist
  const tx = await token.addToWhitelist(addressToWhitelist);
  await tx.wait();
  
  console.log("Address has been whitelisted!");
  
  // Verify the address is whitelisted
  const isWhitelisted = await token.isWhitelisted(addressToWhitelist);
  console.log("Whitelist status:", isWhitelisted);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });