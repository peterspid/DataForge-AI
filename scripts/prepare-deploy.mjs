import { appendFile, readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { JsonRpcProvider, Wallet } from "ethers";

const rpcUrl = process.env.ZERO_G_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
let privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
if (!privateKey) {
  const prompt = createInterface({ input: stdin, output: stdout });
  privateKey = (await prompt.question("Deployer private key: ")).trim();
  prompt.close();
}
if (!privateKey.startsWith("0x")) privateKey = `0x${privateKey}`;

const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();
if (network.chainId !== 16602n) throw new Error(`Expected Galileo chain 16602, received ${network.chainId}.`);
const deployer = new Wallet(privateKey, provider);
const validator = Wallet.createRandom();
const envPath = ".env.local";
let existing = "";
try {
  existing = await readFile(envPath, "utf8");
} catch {
  existing = "";
}
const lines = [
  `DATAFORGE_ADMIN_ADDRESS=${deployer.address}`,
  `DATAFORGE_VALIDATOR_ADDRESS=${validator.address}`,
  `DATAFORGE_VALIDATOR_PRIVATE_KEY=${validator.privateKey}`,
];
const filtered = existing
  .split(/\r?\n/)
  .filter((line) => !/^DATAFORGE_(ADMIN_ADDRESS|VALIDATOR_ADDRESS|VALIDATOR_PRIVATE_KEY)=/.test(line))
  .filter(Boolean);
await appendFile(envPath, `${[...filtered, ...lines].join("\n")}\n`);
console.log(`Admin wallet: ${deployer.address}`);
console.log(`Validator wallet: ${validator.address}`);
console.log("Deployment secrets were written to ignored .env.local.");
