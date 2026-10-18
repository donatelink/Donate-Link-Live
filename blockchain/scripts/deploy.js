const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`Network  : ${network}`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`Balance  : ${hre.ethers.formatEther(balance)} POL`);

  if (balance === 0n) {
    throw new Error("Deployer has 0 balance. Fund it at https://faucet.polygon.technology");
  }

  const registry = await hre.ethers.deployContract("DonationRegistry");
  await registry.waitForDeployment();
  const address = await registry.getAddress();

  console.log(`\nDonationRegistry deployed to: ${address}`);
  if (network === "amoy") {
    console.log(`Explorer: https://amoy.polygonscan.com/address/${address}`);
  }

  // Publish the ABI + address into the Next.js app so the frontend can import it.
  const artifact = await hre.artifacts.readArtifact("DonationRegistry");
  const outDir = path.join(__dirname, "..", "..", "utils", "contract");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "DonationRegistry.json"),
    JSON.stringify({ address, network, abi: artifact.abi }, null, 2)
  );
  console.log(`ABI written to utils/contract/DonationRegistry.json`);
  console.log(`\nNow set this in .env.local and Vercel:`);
  console.log(`NEXT_PUBLIC_DONATION_CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
