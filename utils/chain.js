import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import registryArtifact from "./contract/DonationRegistry.json";

// Polygon Amoy testnet. Free POL: https://faucet.polygon.technology
export const AMOY = {
  chainId: 80002,
  chainIdHex: "0x13882",
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  // The official rpc-amoy.polygon.technology endpoint was unreachable (2026-08-29),
  // so we lead with a public node that responds. MetaMask falls back down the list.
  rpcUrls: ["https://polygon-amoy-bor-rpc.publicnode.com", "https://polygon-amoy.drpc.org"],
  blockExplorerUrls: ["https://amoy.polygonscan.com"],
};

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DONATION_CONTRACT_ADDRESS || "";
export const REGISTRY_ABI = registryArtifact.abi;

export function hasMetaMask() {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

export function explorerTxUrl(hash) {
  return `${AMOY.blockExplorerUrls[0]}/tx/${hash}`;
}

export function explorerAddressUrl(address) {
  return `${AMOY.blockExplorerUrls[0]}/address/${address}`;
}

export function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Turn a raw wallet/RPC error into something a donor can actually read. */
export function friendlyChainError(err) {
  const code = err?.code;
  if (code === 4001 || code === "ACTION_REJECTED") return "You rejected the transaction in MetaMask.";
  if (code === -32002) return "MetaMask already has a pending request — open the extension to finish it.";
  if (code === "INSUFFICIENT_FUNDS") return "Not enough POL in your wallet to cover the donation plus gas.";
  if (code === "NETWORK_ERROR") return "Could not reach the Polygon Amoy network. Check your connection and retry.";
  const msg = err?.info?.error?.message || err?.shortMessage || err?.message || "";
  if (/user rejected/i.test(msg)) return "You rejected the transaction in MetaMask.";
  if (/insufficient funds/i.test(msg)) return "Not enough POL in your wallet to cover the donation plus gas.";
  return msg || "Something went wrong talking to the blockchain.";
}

/** Prompt MetaMask for accounts. Returns the connected address. */
export async function connectWallet() {
  if (!hasMetaMask()) {
    throw new Error("MetaMask is not installed. Install it from metamask.io to donate with crypto.");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts?.length) throw new Error("No wallet account was returned by MetaMask.");
  return accounts[0];
}

/** Make sure the wallet is on Amoy, adding the network if it is unknown. */
export async function ensureAmoy() {
  if (!hasMetaMask()) throw new Error("MetaMask is not installed.");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: AMOY.chainIdHex }],
    });
  } catch (err) {
    // 4902 = chain not added to this wallet yet.
    if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: AMOY.chainIdHex,
            chainName: AMOY.chainName,
            nativeCurrency: AMOY.nativeCurrency,
            rpcUrls: AMOY.rpcUrls,
            blockExplorerUrls: AMOY.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function getSigner() {
  const provider = new BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export function getRegistry(signer) {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "No contract address configured. Set NEXT_PUBLIC_DONATION_CONTRACT_ADDRESS after deploying."
    );
  }
  return new Contract(CONTRACT_ADDRESS, REGISTRY_ABI, signer);
}

export async function getBalancePol(address) {
  const provider = new BrowserProvider(window.ethereum);
  return formatEther(await provider.getBalance(address));
}

/**
 * Send a donation through DonationRegistry.
 * Connects, switches to Amoy, submits the tx and waits for one confirmation.
 * @returns {{hash: string, from: string, onchainId: number|null, contractAddress: string}}
 */
export async function sendDonation({ ngoWallet, ngoId, cause, amountPol }) {
  await connectWallet();
  await ensureAmoy();

  const signer = await getSigner();
  const from = await signer.getAddress();
  const registry = getRegistry(signer);

  const tx = await registry.donate(ngoWallet, ngoId, cause, {
    value: parseEther(String(amountPol)),
  });
  const receipt = await tx.wait(1);

  // Pull the on-chain donation id straight out of the emitted event.
  let onchainId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog(log);
      if (parsed?.name === "DonationRecorded") {
        onchainId = Number(parsed.args.id);
        break;
      }
    } catch {
      // Not one of our events — ignore.
    }
  }

  return { hash: receipt.hash, from, onchainId, contractAddress: CONTRACT_ADDRESS };
}
