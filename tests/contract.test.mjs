import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ganache from "ganache";
import {
  BrowserProvider,
  ContractFactory,
  Signature,
  Wallet,
  keccak256,
  parseEther,
  toUtf8Bytes,
} from "ethers";

const artifact = JSON.parse(
  await readFile(
    path.join(process.cwd(), "contracts", "artifacts", "DataForgeMarket.json"),
    "utf8",
  ),
);

async function fixture() {
  const server = ganache.provider({ logging: { quiet: true } });
  const provider = new BrowserProvider(server);
  const owner = await provider.getSigner(0);
  const requester = await provider.getSigner(1);
  const contributor = await provider.getSigner(2);
  const validator = Wallet.createRandom();
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, owner);
  const contract = await factory.deploy(validator.address, await owner.getAddress());
  await contract.waitForDeployment();
  return { provider, owner, requester, contributor, validator, contract };
}

async function createBounty(contract, requester, overrides = {}) {
  const block = await requester.provider.getBlock("latest");
  const target = overrides.target ?? 2n;
  const reward = overrides.reward ?? parseEther("0.01");
  const deadline = BigInt(block.timestamp + 3600);
  const tx = await contract.connect(requester).createAndPublish(
    JSON.stringify({ title: "Test collection", type: "Text" }),
    "CC-BY-4.0",
    target,
    reward,
    deadline,
    overrides.minimumScore ?? 70,
    { value: target * reward },
  );
  await tx.wait();
  return { bountyId: 1n, reward, deadline };
}

async function validationSignature({
  contract,
  validator,
  bountyId,
  contributor,
  rootHash,
  storageTxHash,
  fingerprint,
  score,
  reportHash,
  issuedAt,
}) {
  const digest = await contract.validationDigest(
    bountyId,
    contributor,
    rootHash,
    storageTxHash,
    fingerprint,
    score,
    reportHash,
    issuedAt,
  );
  return validator.signMessage(Buffer.from(digest.slice(2), "hex"));
}

test("publishing locks the exact reward pool", async () => {
  const { requester, contract } = await fixture();
  const { reward } = await createBounty(contract, requester);
  const bounty = await contract.getBounty(1n);
  assert.equal(bounty.balance, reward * 2n);
  assert.equal(Number(bounty.status), 1);
});

test("a validator-approved submission is paid immediately", async () => {
  const { provider, requester, contributor, validator, contract } = await fixture();
  const { reward } = await createBounty(contract, requester);
  const contributorAddress = await contributor.getAddress();
  const rootHash = keccak256(toUtf8Bytes("root"));
  const storageTxHash = keccak256(toUtf8Bytes("storage tx"));
  const fingerprint = keccak256(toUtf8Bytes("file"));
  const reportHash = keccak256(toUtf8Bytes("report"));
  const block = await provider.getBlock("latest");
  const issuedAt = BigInt(block.timestamp);
  const signature = await validationSignature({
    contract,
    validator,
    bountyId: 1n,
    contributor: contributorAddress,
    rootHash,
    storageTxHash,
    fingerprint,
    score: 92,
    reportHash,
    issuedAt,
  });
  const before = await provider.getBalance(contributorAddress);
  const tx = await contract.connect(contributor).submitProof(
    1n,
    rootHash,
    storageTxHash,
    fingerprint,
    92,
    reportHash,
    issuedAt,
    signature,
    "sample.txt",
  );
  const receipt = await tx.wait();
  const after = await provider.getBalance(contributorAddress);
  const gasCost = receipt.gasUsed * receipt.gasPrice;
  assert.equal(after + gasCost - before, reward);
  assert.equal(Number((await contract.getSubmission(1n)).status), 1);
  assert.equal((await contract.getReputation(contributorAddress)).accepted, 1n);
});

test("uncertain validation enters review and requester acceptance pays", async () => {
  const { provider, requester, contributor, validator, contract } = await fixture();
  const { reward } = await createBounty(contract, requester, { minimumScore: 80 });
  const contributorAddress = await contributor.getAddress();
  const rootHash = keccak256(toUtf8Bytes("review root"));
  const storageTxHash = keccak256(toUtf8Bytes("review tx"));
  const fingerprint = keccak256(toUtf8Bytes("review file"));
  const reportHash = keccak256(toUtf8Bytes("review report"));
  const block = await provider.getBlock("latest");
  const issuedAt = BigInt(block.timestamp);
  const signature = await validationSignature({
    contract,
    validator,
    bountyId: 1n,
    contributor: contributorAddress,
    rootHash,
    storageTxHash,
    fingerprint,
    score: 45,
    reportHash,
    issuedAt,
  });
  await (
    await contract.connect(contributor).submitProof(
      1n,
      rootHash,
      storageTxHash,
      fingerprint,
      45,
      reportHash,
      issuedAt,
      signature,
      "needs-review.txt",
    )
  ).wait();
  assert.equal(Number((await contract.getSubmission(1n)).status), 0);
  const before = await provider.getBalance(contributorAddress);
  await (await contract.connect(requester).reviewSubmission(1n, true)).wait();
  const after = await provider.getBalance(contributorAddress);
  assert.equal(after - before, reward);
});

test("duplicate fingerprints are rejected across the marketplace", async () => {
  const { provider, requester, contributor, validator, contract } = await fixture();
  await createBounty(contract, requester);
  const contributorAddress = await contributor.getAddress();
  const fingerprint = keccak256(toUtf8Bytes("same file"));
  for (let index = 0; index < 2; index += 1) {
    const rootHash = keccak256(toUtf8Bytes(`root ${index}`));
    const storageTxHash = keccak256(toUtf8Bytes(`tx ${index}`));
    const reportHash = keccak256(toUtf8Bytes(`report ${index}`));
    const block = await provider.getBlock("latest");
    const issuedAt = BigInt(block.timestamp);
    const signature = await validationSignature({
      contract,
      validator,
      bountyId: 1n,
      contributor: contributorAddress,
      rootHash,
      storageTxHash,
      fingerprint,
      score: 90,
      reportHash,
      issuedAt,
    });
    const action = contract.connect(contributor).submitProof(
      1n,
      rootHash,
      storageTxHash,
      fingerprint,
      90,
      reportHash,
      issuedAt,
      signature,
      `sample-${index}.txt`,
    );
    if (index === 0) await (await action).wait();
    else await assert.rejects(action);
  }
});

test("expired bounties refund their unused balance", async () => {
  const { provider, requester, contract } = await fixture();
  const { reward } = await createBounty(contract, requester);
  await provider.send("evm_increaseTime", [3700]);
  await provider.send("evm_mine", []);
  const requesterAddress = await requester.getAddress();
  const before = await provider.getBalance(requesterAddress);
  const tx = await contract.connect(requester).closeExpiredBounty(1n);
  const receipt = await tx.wait();
  const gasCost = receipt.gasUsed * receipt.gasPrice;
  const after = await provider.getBalance(requesterAddress);
  assert.equal(after + gasCost - before, reward * 2n);
  assert.equal((await contract.getBounty(1n)).balance, 0n);
});

test("pause blocks new economic actions", async () => {
  const { owner, requester, contract } = await fixture();
  await (await contract.connect(owner).setPaused(true)).wait();
  const block = await requester.provider.getBlock("latest");
  await assert.rejects(
    contract.connect(requester).createAndPublish(
      "{}",
      "CC0",
      1,
      parseEther("0.01"),
      block.timestamp + 3600,
      70,
      { value: parseEther("0.01") },
    ),
  );
});

