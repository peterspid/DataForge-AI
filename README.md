# DataForge

DataForge is a data-bounty and provenance workspace built for the **0G Galileo testnet**. Requesters can define data collection tasks, contributors can upload matching files to 0G Storage, and every successful contribution receives a verifiable storage root and transaction receipt.

The product follows one rule: **proofs before promises**. Data is shown as stored only after 0G returns a real receipt. The application does not seed fake marketplace activity, invent quality scores, or simulate blockchain transactions and payments.

**Live application:** [https://dataforge-0g.vercel.app](https://dataforge-0g.vercel.app)

## What DataForge does

### For requesters

- Create data bounties for images, audio, text, JSON, or CSV data.
- Define the collection target, location or language, tags, reward pool, and reward per contribution.
- Search and filter bounties in the marketplace.
- Review stored contributions and their provenance receipts.
- Export a JSON dataset manifest containing the real 0G root and transaction hash for each contribution.

### For contributors

- Connect an injected EVM wallet such as MetaMask.
- Add or switch the wallet to the 0G Galileo network.
- Select an open bounty and upload a compatible file.
- See the upload state while the Merkle proof and transaction are processed.
- Inspect and copy the resulting storage root.
- Open the transaction and storage explorers for independent verification.

## How it works

```text
Create bounty
     ↓
Select a compatible file
     ↓
Validate file size and type
     ↓
Calculate local SHA-256 duplicate fingerprint
     ↓
Build the file Merkle tree with the 0G Storage SDK
     ↓
Sign the storage transaction with the connected wallet
     ↓
Upload through the Galileo RPC and 0G Turbo indexer
     ↓
Record the contribution only after receiving its root and transaction hash
     ↓
Inspect the proof or export it in a dataset manifest
```

Private keys are never requested by or embedded in the frontend. Every upload transaction is signed through the user’s connected wallet.

## Current features

- Responsive multi-view dashboard and mobile navigation.
- Wallet connection, account-change handling, and Galileo network switching.
- Live Galileo block-height health indicator.
- Real wallet-signed uploads to 0G Turbo Storage.
- On-chain shared bounties with exact reward-pool escrow.
- Validator-attested acceptance with automatic Galileo settlement.
- 25 MB upload limit and bounty-specific file-type validation.
- Browser-side SHA-256 duplicate detection for the current workspace.
- Receipt-backed submissions with a real Merkle root and transaction hash.
- Proof Inspector with ChainScan and StorageScan links.
- Downloadable provenance manifests for collected datasets.
- Wallet profile metrics derived only from real workspace records.
- Empty, loading, success, and error states without dummy data.
- Keyboard focus states, semantic labels, reduced-motion support, and Escape-key modal closing.
- Production security headers and a dependency audit with no known production vulnerabilities.

## Network configuration

| Setting | Value |
| --- | --- |
| Network | 0G Galileo testnet |
| Chain ID | `16602` (`0x40da`) |
| RPC | `https://evmrpc-testnet.0g.ai` |
| Storage indexer | `https://indexer-storage-testnet-turbo.0g.ai` |
| Chain explorer | `https://chainscan-galileo.0g.ai` |
| Storage explorer | `https://storagescan-galileo.0g.ai` |
| DataForge escrow contract | `0x6a440691ee49785BD9863F1232b0F054c94B8167` |

## Technology

- Next.js 16
- React 19
- TypeScript
- ethers 6
- Official 0G Storage TypeScript SDK browser bundle
- Vercel Analytics and Vercel hosting
- On-chain contract reads for shared workspace state

## Architecture

```text
Next.js browser application
  ├─ Bounties and submissions → DataForge Galileo escrow contract
  ├─ Wallet identity → injected EIP-1193 provider
  ├─ Network health → Galileo JSON-RPC
  ├─ Duplicate guard → Web Crypto SHA-256
  ├─ Merkle tree and upload → 0G Storage SDK
  ├─ Transaction approval → connected wallet
  ├─ File persistence → 0G Turbo Storage
  └─ Verification → ChainScan, StorageScan, and exported manifests
```

Important source files:

```text
frontend/
  app/
    page.tsx                Product views and workflows
    globals.css             Design system and responsive styling
    layout.tsx              Application metadata and root layout
    icon.svg                DataForge favicon
    lib/zero-g-storage.ts   Storage upload and fingerprint utilities
  next.config.mjs           Production security headers
  package.json              Dependencies and release commands
  pnpm-workspace.yaml       Dependency overrides and install policy
```

## Run locally

### Requirements

- Node.js 22 or newer
- pnpm
- An injected EVM wallet
- Galileo test tokens for storage transaction gas

### Installation

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

No private key or 0G API key is required for the current browser-signed storage workflow.

## Verify a release

```bash
cd frontend
pnpm lint
pnpm audit --prod
pnpm build
pnpm start
```

The release should pass TypeScript checking, report no known production dependency vulnerabilities, and complete an optimized production build.

## Deploy to Vercel

```bash
cd frontend
vercel deploy --prod --yes --scope qwdxqws-projects
```

Secrets must never use a `NEXT_PUBLIC_` variable unless they are intentionally safe to expose in the browser.

## Current production boundary

The deployed application is a shared, on-chain Galileo testnet marketplace. Bounties are funded in the [DataForge escrow contract](https://chainscan-galileo.0g.ai/address/0x6a440691ee49785BD9863F1232b0F054c94B8167), accepted submissions settle automatically, and the server-only validator checks supported text and structured files through 0G Compute. Binary media receives technical checks and remains in requester review until a suitable model is available.

These boundaries are intentional so the UI never presents unfinished economic or validation features as real.

## Roadmap to a fully production-ready marketplace

### 1. Shared marketplace state

- Implemented: wallet-linked requester and contributor identity.
- Implemented: shared bounty and submission records in the DataForge Galileo contract.
- Implemented: wallet-independent reads and 45-second client synchronization.
- Implemented: draft, active, review, completed, cancelled, and archived lifecycle states.
- Remaining: production indexer/database for fast queries and durable notification delivery.

### 2. Audited escrow and settlement

- Implemented: deployed DataForge escrow contract on Galileo at `0x6a440691ee49785BD9863F1232b0F054c94B8167`.
- Implemented: exact reward-pool funding at publication and automatic payment for validator-approved submissions.
- Implemented: requester review, partial completion, expiry refunds, contributor disputes, duplicate fingerprints, and admin pause.
- Implemented: six local-chain contract tests covering funding, settlement, review, duplicates, refunds, and pause behavior.
- Remaining: independent audit, multisig administration, public testnet review period, and mainnet deployment.

### 3. DataForge validation

- Implemented: server-only `/api/validate` route with size, filename, JSON parsing, and technical checks.
- Implemented: 0G Router integration, signed report hash, and on-chain validator attestation.
- Implemented: explainable report storage and requester review for uncertain results.
- Implemented: binary media fail-closed behavior when the available testnet model cannot inspect semantics.
- Remaining: replace the currently rejected Router credential, add malware scanning, media metadata inspection, and cross-workspace similarity.

### 4. Reputation and moderation

- Implemented: on-chain requester/contributor counters for created bounties, submissions, acceptance, rejection, disputes, earned, and paid values.
- Implemented: one-report-per-wallet submission reporting and dispute events.
- Remaining: authenticated moderation console, rate limits, abuse scoring, appeals, and a human review queue.

### 5. Dataset access and licensing

- Implemented: machine-readable license metadata in bounties and exported manifests.
- Implemented: provenance-preserving root, storage transaction, validation report, and timestamp records.
- Remaining: encrypted/token-gated access, dataset commerce, royalty contracts, version revocation, and deletion workflows.

### 6. Operational readiness

- Implemented: strict TypeScript, production builds, dependency audit, contract tests, security headers, and live RPC health checks.
- Implemented: on-chain event trail for bounties, submissions, payments, disputes, reports, and administrative actions.
- Remaining: browser E2E matrix, error tracking, alerting, backups, incident response, legal pages, threat modeling, penetration testing, contract audit, and mainnet review.

## Security principles

- Never commit wallet private keys or API keys.
- Keep 0G Compute and administrative credentials on the server only.
- Treat wallet signatures as explicit user actions.
- Validate uploads before spending transaction gas.
- Do not show a contribution as stored without a real 0G receipt.
- Do not show rewards as paid without an on-chain settlement transaction.
- Preserve verifiable provenance from the original contribution through every exported dataset version.
 
## Status

- Frontend deployment: live
- Target network: 0G Galileo testnet
- Real storage receipts: implemented
- Shared multi-user backend: implemented through the on-chain DataForge contract
- Escrow and automatic payments: implemented on Galileo testnet
- 0G Compute quality validation: implemented for text and structured files
- Mainnet readiness: planned after testing and audits
