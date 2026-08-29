import { Blob as ZgBlob, Indexer } from "@0gfoundation/0g-storage-ts-sdk/browser";
import { BrowserProvider } from "ethers";

export const ZERO_G_RPC_URL = "https://evmrpc-testnet.0g.ai";
export const ZERO_G_STORAGE_INDEXER =
  "https://indexer-storage-testnet-turbo.0g.ai";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type StorageReceipt = {
  rootHash: string;
  txHash: string;
};

export async function fingerprintFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return `0x${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

export async function uploadToZeroG(
  file: File,
  ethereum: EthereumProvider,
  onStatus?: (message: string) => void,
): Promise<StorageReceipt> {
  onStatus?.("Preparing the Merkle proof…");
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  const data = new ZgBlob(file);
  const [, treeError] = await data.merkleTree();
  if (treeError) throw new Error(`Could not hash the file: ${treeError}`);

  onStatus?.("Waiting for your 0G Storage transaction…");
  const indexer = new Indexer(ZERO_G_STORAGE_INDEXER);
  const [transaction, uploadError] = await indexer.upload(
    data,
    ZERO_G_RPC_URL,
    signer,
  );
  if (uploadError) throw new Error(`0G Storage upload failed: ${uploadError}`);

  if ("rootHash" in transaction) {
    return {
      rootHash: transaction.rootHash,
      txHash: transaction.txHash,
    };
  }
  if (!transaction.rootHashes[0] || !transaction.txHashes[0]) {
    throw new Error("0G Storage did not return a verifiable receipt.");
  }
  return {
    rootHash: transaction.rootHashes[0],
    txHash: transaction.txHashes[0],
  };
}
