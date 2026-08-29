import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import solc from "solc";

const root = process.cwd();
const contractPath = path.join(root, "contracts", "DataForgeMarket.sol");
const source = await readFile(contractPath, "utf8");
const input = {
  language: "Solidity",
  sources: {
    "DataForgeMarket.sol": { content: source },
  },
  settings: {
    optimizer: { enabled: true, runs: 500 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
if (errors.length) {
  throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));
}

const compiled = output.contracts["DataForgeMarket.sol"].DataForgeMarket;
const artifact = {
  contractName: "DataForgeMarket",
  abi: compiled.abi,
  bytecode: `0x${compiled.evm.bytecode.object}`,
  deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`,
};
const artifactDir = path.join(root, "contracts", "artifacts");
await mkdir(artifactDir, { recursive: true });
await writeFile(
  path.join(artifactDir, "DataForgeMarket.json"),
  `${JSON.stringify(artifact, null, 2)}\n`,
);
console.log("Compiled DataForgeMarket.sol");
