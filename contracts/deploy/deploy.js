async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const FVC = await ethers.getContractFactory("FVC");
  const fvc = await FVC.deploy();
  await fvc.deployed();

  console.log("FVC deployed to:", fvc.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 