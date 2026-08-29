import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react";

export const metadata = {
  title: "DataForge Docs",
  description: "How DataForge works on the 0G Galileo testnet.",
};

export default function DocsPage() {
  return (
    <main className="docs-page">
      <nav className="docs-nav"><Link href="/" className="brand-mark"><span className="brand-symbol">D</span><span>DataForge</span></Link><Link className="text-button" href="/"><ArrowLeft size={15} /> Back home</Link></nav>
      <div className="docs-layout">
        <aside className="docs-aside"><p className="eyebrow">Documentation</p><a href="#start">Get started</a><a href="#workflow">How it works</a><a href="#contract">Contract and network</a><a href="#security">Security</a><a href="#roadmap">Roadmap</a></aside>
        <article className="docs-content">
          <p className="eyebrow">DataForge docs</p><h1>Build datasets you can verify.</h1><p className="docs-lede">DataForge is a proof-first data marketplace for the 0G Galileo testnet. Requesters fund collection tasks, contributors upload files, and accepted work settles through an on-chain escrow contract.</p>
          <section id="start"><h2>Get started</h2><ol><li>Open the <Link href="/dashboard">dashboard</Link> and connect an EVM wallet.</li><li>Switch to 0G Galileo (chain ID 16602).</li><li>Create a bounty with a target, reward per item, and escrow pool.</li><li>Select a live bounty, upload a compatible file, and confirm the wallet transaction.</li></ol><Link className="button button-primary" href="/dashboard">Open dashboard <ArrowRight size={15} /></Link></section>
          <section id="workflow"><h2>How it works</h2><div className="docs-steps"><div><strong>01</strong><span>Request</span><p>A bounty and its reward pool are published on Galileo.</p></div><div><strong>02</strong><span>Store</span><p>The browser builds a Merkle tree and uploads through 0G Turbo Storage.</p></div><div><strong>03</strong><span>Validate</span><p>The server signs a report hash after technical and quality checks.</p></div><div><strong>04</strong><span>Settle</span><p>The contract releases the reward automatically or routes the item to review.</p></div></div></section>
          <section id="contract"><h2>Contract and network</h2><p>DataForge runs on 0G Galileo testnet. Bounties, submissions, review decisions, disputes, refunds, and payments are recorded by the escrow contract.</p><dl className="docs-facts"><div><dt>Chain ID</dt><dd>16602 (0x40da)</dd></div><div><dt>RPC</dt><dd>evmrpc-testnet.0g.ai</dd></div><div><dt>Escrow</dt><dd>0x6a4406…4B8167</dd></div></dl><a className="text-button" href="https://chainscan-galileo.0g.ai/address/0x6a440691ee49785BD9863F1232b0F054c94B8167" target="_blank" rel="noreferrer">View on ChainScan <ExternalLink size={14} /></a></section>
          <section id="security"><h2>Security principles</h2><ul>{["Private keys stay in the connected wallet or server environment.","A submission is not marked stored without a real 0G receipt.","Rewards are not shown as paid without a settlement transaction.","Uncertain validation results remain in requester review."].map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul></section>
          <section id="roadmap"><h2>Roadmap</h2><p>Next production gates include an independent contract audit, multisig administration, a valid 0G Router credential, production indexing and notifications, richer malware/media inspection, moderation, licensing controls, and the mainnet review.</p></section>
        </article>
      </div>
    </main>
  );
}
