import artifact from "../../contracts/artifacts/DataForgeMarket.json";
import { BrowserProvider, Contract, ContractTransactionResponse, parseEther } from "ethers";

export const DATAFORGE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_DATAFORGE_CONTRACT_ADDRESS ?? "";
export const DATAFORGE_CONTRACT_ABI = artifact.abi;

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
  if (!DATAFORGE_CONTRACT_ADDRESS) {
    throw new Error("DataForge contract address is not configured.");
  }
  const provider = new BrowserProvider(ethereum);
  return write
    ? new Contract(DATAFORGE_CONTRACT_ADDRESS, DATAFORGE_CONTRACT_ABI, await provider.getSigner())
    : new Contract(DATAFORGE_CONTRACT_ADDRESS, DATAFORGE_CONTRACT_ABI, provider);
}

export async function contractRead(ethereum: WalletEthereum) {
  if (!DATAFORGE_CONTRACT_ADDRESS) {
    throw new Error("DataForge contract address is not configured.");
  }
  const provider = new BrowserProvider(ethereum);
  return new Contract(DATAFORGE_CONTRACT_ADDRESS, DATAFORGE_CONTRACT_ABI, provider);
}

export async function contractWrite(ethereum: WalletEthereum) {
  if (!DATAFORGE_CONTRACT_ADDRESS) {
    throw new Error("DataForge contract address is not configured.");
  }
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  return new Contract(DATAFORGE_CONTRACT_ADDRESS, DATAFORGE_CONTRACT_ABI, signer);
}

export async function waitForTransaction(tx: ContractTransactionResponse) {
  const receipt = await tx.wait();
  if (!receipt) throw new Error("The Galileo transaction did not return a receipt.");
  return receipt;
}

export function parseReward(value: string) {
  return parseEther(value || "0");
}
