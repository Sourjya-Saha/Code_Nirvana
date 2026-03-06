// scripts/checkWhitelist.js
const { ethers } = require("hardhat");

async function main() {
  const addressesToCheck = [
    "0x632de8AD2299621F01bdF470399762d0064544A6", // Your deployer address
    "0xAnotherAddressToCheck" // Replace with address you want to check
  ];
  
  // Get the contract instance
  const NirvanaToken = await ethers.getContractFactory("NirvanaToken");
  const token = await NirvanaToken.attach("0x1786eB32d0B35dbeCb80D168625Df78785f79811");
  
  for (const address of addressesToCheck) {
    const isWhitelisted = await token.isWhitelisted(address);
    console.log(`Address ${address} is whitelisted: ${isWhitelisted}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });