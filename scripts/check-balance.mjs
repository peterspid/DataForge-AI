import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { formatEther, JsonRpcProvider, Wallet } from "ethers";

const prompt = createInterface({ input: stdin, output: stdout });
let key = (await prompt.question("Wallet private key: ")).trim();
prompt.close();
if (!key.startsWith("0x")) key = `0x${key}`;
const provider = new JsonRpcProvider(process.env.ZERO_G_RPC_URL ?? "https://evmrpc-testnet.0g.ai");
const wallet = new Wallet(key, provider);
console.log(`${wallet.address}: ${formatEther(await provider.getBalance(wallet.address))} 0G`);
