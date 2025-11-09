import { ethers, upgrades } from "hardhat";

async function main() {
  const SAFE = process.env.SAFE_ADDRESS!; // Gnosis Safe admin/fund-manager
  const STAKING = process.env.STAKING_ADDRESS!;
  const USDC = process.env.AAVE_USDC!;
  const POOL = process.env.AAVE_POOL!;
  const A_USDC = process.env.AAVE_AUSDC!;
  const DEPOSIT_USDC = process.env.DEPOSIT_USDC || "0"; // e.g. "3" to deposit 3 USDC

  if (!SAFE || !STAKING || !USDC || !POOL || !A_USDC) {
    throw new Error("Missing env: SAFE_ADDRESS, STAKING_ADDRESS, AAVE_USDC, AAVE_POOL, AAVE_AUSDC");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) Deploy Treasury (UUPS)
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await upgrades.deployProxy(
    Treasury,
    [SAFE, [SAFE], 1, 7 * 24 * 60 * 60],
    { kind: "uups" }
  );
  await treasury.waitForDeployment();
  const TREASURY = await treasury.getAddress();
  console.log("Treasury:", TREASURY);

  // 2) Deploy Adapter
  const Adapter = await ethers.getContractFactory("AaveYieldAdapter");
  const adapter = await Adapter.deploy(USDC, POOL, A_USDC, TREASURY);
  await adapter.waitForDeployment();
  const ADAPTER = await adapter.getAddress();
  console.log("Adapter:", ADAPTER);

  // 3) Wire adapter & distribution rules (100% to Staking)
  await (await treasury.setYieldAdapter(ADAPTER)).wait();
  await (
    await treasury.updateDistributionRules(
      10000, // stakers bps
      0, // treasury bps
      0, // ops bps
      0, // dev bps
      STAKING,
      ethers.ZeroAddress,
      ethers.ZeroAddress
    )
  ).wait();
  console.log("Rules set: 100% to", STAKING);

  // 4) Make Treasury the Staking owner (requires current owner to call separately if not deployer)
  // NOTE: If deployer is not the owner, skip and execute ownership transfer via Safe/owner UI
  try {
    const staking = await ethers.getContractAt("Staking", STAKING);
    const owner = await staking.owner();
    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
      await (await staking.transferOwnership(TREASURY)).wait();
      console.log("Staking ownership transferred to Treasury");
    } else {
      console.log("Staking owner is", owner, "- please transfer ownership to Treasury manually.");
    }
  } catch (e) {
    console.log("(Info) Could not auto-transfer staking ownership:", (e as Error).message);
  }

  // 5) Optional: fund and deposit an initial amount
  if (Number(DEPOSIT_USDC) > 0) {
    const usdc = await ethers.getContractAt("IERC20", USDC);
    const amount = ethers.parseUnits(DEPOSIT_USDC, 6);
    await (await usdc.transfer(TREASURY, amount)).wait();
    await (await treasury.depositToAdapter(USDC, amount)).wait();
    console.log(`Deposited ${DEPOSIT_USDC} USDC into adapter via Treasury`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
