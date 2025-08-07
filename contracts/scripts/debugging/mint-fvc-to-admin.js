const { ethers } = require("hardhat");

async function main() {
  // Get the admin wallet (first signer)
  const [admin] = await ethers.getSigners();
  
  // You can update these addresses after deployment
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057"; // Update with new address
  
  // Amount to mint (e.g., 1,000,000 FVC)
  const FVC_TO_MINT = ethers.parseUnits("1000000", 18);

  console.log("Minting FVC tokens to admin wallet...");
  console.log("Admin address:", admin.address);
  console.log("Amount to mint:", ethers.formatUnits(FVC_TO_MINT, 18), "FVC");

  // Get FVC contract instance
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);

  // Check if admin has MINTER_ROLE
  const MINTER_ROLE = await fvc.MINTER_ROLE();
  const hasMinterRole = await fvc.hasRole(MINTER_ROLE, admin.address);
  
  if (!hasMinterRole) {
    console.log("❌ Admin does not have MINTER_ROLE. Granting role first...");
    
    // Grant MINTER_ROLE to admin (assuming admin is the default admin)
    const grantTx = await fvc.grantRole(MINTER_ROLE, admin.address);
    console.log("Grant MINTER_ROLE tx hash:", grantTx.hash);
    await grantTx.wait();
    console.log("✅ MINTER_ROLE granted to admin");
  }

  // Mint FVC tokens to admin
  const mintTx = await fvc.mint(admin.address, FVC_TO_MINT);
  console.log("Mint tx hash:", mintTx.hash);
  await mintTx.wait();
  
  console.log(`✅ Successfully minted ${ethers.formatUnits(FVC_TO_MINT, 18)} FVC to admin wallet.`);
  
  // Check new balance
  const balance = await fvc.balanceOf(admin.address);
  console.log(`Admin FVC balance: ${ethers.formatUnits(balance, 18)} FVC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
