"use client";

import Link from "next/link";
import { ArrowRight, Check, Database, ShieldCheck, Wallet } from "lucide-react";

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="DataForge navigation">
        <Link className="brand-mark" href="/">
          <span className="brand-symbol">D</span>
          <span>DataForge</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#how-it-works">How it works</a>
          <Link href="/docs">Docs</Link>
          <button className="button button-small button-primary" onClick={onGetStarted}>
            Get started <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">0G Galileo testnet marketplace</p>
          <h1>Useful data, with proof built in.</h1>
          <p className="landing-lede">
            DataForge connects teams that need reliable datasets with contributors who can deliver them—then records every accepted file on-chain.
          </p>
          <div className="landing-actions">
            <button className="button button-primary" onClick={onGetStarted}>
              <Wallet size={17} /> Connect wallet <ArrowRight size={15} />
            </button>
            <Link className="button button-secondary" href="/docs">Read the docs</Link>
          </div>
          <div className="landing-proof-row">
            <span><Check size={14} /> 0G Storage receipts</span>
            <span><Check size={14} /> Escrowed rewards</span>
            <span><Check size={14} /> Verifiable provenance</span>
          </div>
        </div>
        <div className="landing-hero-art" aria-label="DataForge workflow preview">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-console">
            <div className="hero-console-top"><span /> <span /> <span /></div>
            <div className="hero-console-title"><ShieldCheck size={18} /> Proof pipeline</div>
            <div className="hero-console-line"><span>Storage root</span><strong>0x8c…4f21</strong></div>
            <div className="hero-console-line"><span>Validator</span><strong className="hero-status">Verified</strong></div>
            <div className="hero-console-line"><span>Settlement</span><strong>0.25 0G</strong></div>
            <div className="hero-console-bar"><span /></div>
          </div>
        </div>
      </section>

      <section className="landing-strip" aria-label="DataForge highlights">
        <div><strong>01</strong><span>Define a bounty</span></div>
        <div><strong>02</strong><span>Contribute to 0G Storage</span></div>
        <div><strong>03</strong><span>Verify and settle on-chain</span></div>
      </section>

      <section className="landing-section" id="how-it-works">
        <div className="landing-section-heading">
          <p className="eyebrow">A simple workflow</p>
          <h2>From request to receipt in one clear trail.</h2>
        </div>
        <div className="landing-feature-grid">
          <article><Database size={19} /><h3>Shared bounties</h3><p>Requests live on Galileo so contributors and requesters see the same state.</p></article>
          <article><ShieldCheck size={19} /><h3>Proof-first uploads</h3><p>Files are recorded only after 0G returns a real root and storage transaction.</p></article>
          <article><Wallet size={19} /><h3>Fair settlement</h3><p>Rewards stay in escrow and release only after the acceptance policy succeeds.</p></article>
        </div>
      </section>

      <footer className="landing-footer"><span>DataForge · 0G Galileo testnet</span><Link href="/docs">Documentation <ArrowRight size={14} /></Link></footer>
    </main>
  );
}
