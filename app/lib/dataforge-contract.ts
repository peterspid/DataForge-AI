import artifact from "../../contracts/artifacts/DataForgeMarket.json";
import { BrowserProvider, Contract, ContractTransactionResponse, JsonRpcProvider, getAddress, parseEther } from "ethers";

export const DATAFORGE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_DATAFORGE_CONTRACT_ADDRESS ?? "";
export const DATAFORGE_CONTRACT_ABI = artifact.abi;
export const DATAFORGE_RPC_URL = "https://evmrpc-testnet.0g.ai";
const GALILEO_NETWORK = { chainId: 16602, name: "0g-galileo" } as const;

function configuredContractAddress() {
  const candidate = DATAFORGE_CONTRACT_ADDRESS.trim();
  if (!candidate) throw new Error("DataForge contract address is not configured.");
  try {
    return getAddress(candidate);
  } catch {
    throw new Error("DataForge contract address is invalid. Refresh the app and try again.");
  }
}

export type WalletEthereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export function getEthereum(): WalletEthereum | null {
  if (typeof window === "undefined") return null;
  return (
    window as Window & { ethereum?: WalletEthereum }
  ).ethereum ?? null;
}

export async function getBrowserContract(ethereum: WalletEthereum, write = false) {
  const address = configuredContractAddress();
  const provider = new BrowserProvider(ethereum, GALILEO_NETWORK);
  return write
    ? new Contract(address, DATAFORGE_CONTRACT_ABI, await provider.getSigner())
    : new Contract(address, DATAFORGE_CONTRACT_ABI, provider);
}

export async function contractRead(ethereum: WalletEthereum) {
  const address = configuredContractAddress();
  const provider = new BrowserProvider(ethereum, GALILEO_NETWORK);
  return new Contract(address, DATAFORGE_CONTRACT_ABI, provider);
}

export function publicContract() {
  const address = configuredContractAddress();
  return new Contract(
    address,
    DATAFORGE_CONTRACT_ABI,
    new JsonRpcProvider(DATAFORGE_RPC_URL, GALILEO_NETWORK),
  );
}

export async function contractWrite(ethereum: WalletEthereum) {
  const address = configuredContractAddress();
  const provider = new BrowserProvider(ethereum, GALILEO_NETWORK);
  const signer = await provider.getSigner();
  return new Contract(address, DATAFORGE_CONTRACT_ABI, signer);
}

export async function waitForTransaction(tx: ContractTransactionResponse) {
  const receipt = await tx.wait();
  if (!receipt) throw new Error("The Galileo transaction did not return a receipt.");
  return receipt;
}

export function parseReward(value: string) {
  return parseEther(value || "0");
}
