import { readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";

const rpcUrl = process.env.ZERO_G_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
const validatorAddress = process.env.DATAFORGE_VALIDATOR_ADDRESS;
const adminAddress = process.env.DATAFORGE_ADMIN_ADDRESS;

if (!validatorAddress || !adminAddress) {
  throw new Error("DATAFORGE_VALIDATOR_ADDRESS and DATAFORGE_ADMIN_ADDRESS are required.");
}

let privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
if (!privateKey) {
  const prompt = createInterface({ input: stdin, output: stdout });
  privateKey = (await prompt.question("Deployer private key: ")).trim();
  prompt.close();
}
if (!privateKey.startsWith("0x")) privateKey = `0x${privateKey}`;

const artifactPath = path.join(
  process.cwd(),
  "contracts",
  "artifacts",
  "DataForgeMarket.json",
);
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();
if (network.chainId !== 16602n) throw new Error(`Expected Galileo chain 16602, received ${network.chainId}.`);

const wallet = new Wallet(privateKey, provider);
const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
console.log(`Deploying DataForgeMarket from ${wallet.address}…`);
const contract = await factory.deploy(validatorAddress, adminAddress);
const receipt = await contract.deploymentTransaction()?.wait();
console.log(`Contract: ${await contract.getAddress()}`);
console.log(`Transaction: ${receipt?.hash ?? "unknown"}`);
console.log(`Block: ${receipt?.blockNumber ?? "unknown"}`);
