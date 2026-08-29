# DataForge AI

DataForge AI is a data-bounty and provenance workspace built for the **0G Galileo testnet**. Requesters can define data collection tasks, contributors can upload matching files to 0G Storage, and every successful contribution receives a verifiable storage root and transaction receipt.

The product follows one rule: **proofs before promises**. Data is shown as stored only after 0G returns a real receipt. The application does not seed fake marketplace activity, invent quality scores, or simulate blockchain transactions and payments.

**Live application:** [https://frontend-teal-beta-ype2l2g0md.vercel.app](https://frontend-teal-beta-ype2l2g0md.vercel.app)

## What DataForge AI does

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

## Technology

- Next.js 16
- React 19
- TypeScript
- ethers 6
- Official 0G Storage TypeScript SDK browser bundle
- Vercel Analytics and Vercel hosting
- Browser `localStorage` for current workspace recovery

## Architecture

```text
Next.js browser application
  ├─ Bounties and submissions → local workspace storage
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

The deployed application is a working **Galileo testnet storage and provenance MVP**. It is suitable for testing wallet connection, bounty configuration, real storage uploads, receipt inspection, and manifest export.

It is not yet a financial-grade, multi-user production marketplace. Bounties and workspace records currently remain in the user’s browser. Reward values are collection metadata; there is no deployed escrow contract or automatic payment settlement. ForgeGuard currently exposes proof verification information but does not run server-side AI validation.

These boundaries are intentional so the UI never presents unfinished economic or validation features as real.

## Roadmap to a fully production-ready marketplace

### 1. Shared marketplace state

- Add authenticated requester and contributor accounts linked to wallet addresses.
- Move bounty and submission metadata from local storage to a shared indexed data layer.
- Add wallet-scoped synchronization across browsers and devices.
- Add lifecycle states for drafts, active collections, review, completion, cancellation, and archival.
- Add notifications for new submissions, decisions, disputes, and payments.

### 2. Audited escrow and settlement

- Build a 0G-compatible bounty escrow smart contract.
- Lock the requester’s reward pool when a bounty is published.
- Release rewards only after an explicit acceptance policy succeeds.
- Support refunds, deadlines, partial completion, disputes, and emergency pauses.
- Complete independent contract audits, invariant testing, and a public testnet period before mainnet use.

### 3. DataForge validation

- Add server-side file inspection and malware protection before downstream processing.
- Integrate 0G Compute through a server-only API route.
- Validate MIME type, corruption, dimensions, duration, schema, and required metadata.
- Add cross-workspace duplicate and similarity detection.
- Produce explainable quality reports instead of unexplained numeric scores.
- Route uncertain or disputed results to human review.

### 4. Reputation and moderation

- Introduce reputation based only on verifiable completed activity.
- Separate requester reputation from contributor reputation.
- Add spam controls, rate limits, reporting, moderation queues, and wallet abuse detection.
- Design an appeal process and transparent enforcement history.

### 5. Dataset access and licensing

- Add encrypted or token-gated access for private datasets.
- Store machine-readable license terms and consent metadata in manifests.
- Add dataset purchasing, royalty distribution, version history, and revocation rules.
- Provide requester exports for training pipelines and contributor data-deletion workflows where legally required.

### 6. Operational readiness

- Add unit, integration, smart-contract, and browser end-to-end test suites.
- Test wallet and browser compatibility across desktop and mobile providers.
- Add error tracking, RPC and indexer monitoring, transaction alerts, and public service status.
- Add structured logs, audit trails, backups, recovery procedures, and incident-response documentation.
- Establish performance budgets, accessibility testing, privacy policy, terms of service, and data-retention rules.
- Complete threat modeling, penetration testing, contract audits, and mainnet launch review.

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
- Shared multi-user backend: planned
- Escrow and automatic payments: planned
- 0G Compute quality validation: planned
- Mainnet readiness: planned after testing and audits
