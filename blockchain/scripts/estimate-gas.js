// Prints what a deploy + a donation actually cost, at live Amoy gas prices.
const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  const factory = await hre.ethers.getContractFactory("DonationRegistry");
  const c = await factory.deploy();
  const deployGas = (await c.deploymentTransaction().wait()).gasUsed;

  const [, donor, ngo] = await hre.ethers.getSigners();
  const tx = await c.connect(donor).donate(ngo.address, "uuid", "Clean Water Access", {
    value: hre.ethers.parseEther("0.01"),
  });
  const donateGas = (await tx.wait()).gasUsed;

  const p = new ethers.JsonRpcProvider("https://polygon-amoy-bor-rpc.publicnode.com", 80002);
  const fee = await p.getFeeData();
  const gwei = fee.gasPrice ?? ethers.parseUnits("30", "gwei");

  const cost = (g) => Number(ethers.formatEther(g * gwei));
  console.log(`live Amoy gas price : ${ethers.formatUnits(gwei, "gwei")} gwei`);
  console.log(`deploy   : ${deployGas} gas  =  ${cost(deployGas).toFixed(5)} POL`);
  console.log(`donate   : ${donateGas} gas  =  ${cost(donateGas).toFixed(5)} POL`);
  console.log(`\ndeploy + 10 donations = ${(cost(deployGas) + 10 * cost(donateGas)).toFixed(4)} POL`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
