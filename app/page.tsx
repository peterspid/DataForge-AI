"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { formatEther, keccak256, toUtf8Bytes } from "ethers";
import { fingerprintFile, uploadToZeroG } from "./lib/zero-g-storage";
import LandingPage from "./components/LandingPage";
import {
  contractWrite,
  getEthereum,
  getWalletBalance,
  parseReward,
  publicContract,
  waitForTransaction,
} from "./lib/dataforge-contract";
import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardCheck,
  CloudUpload,
  Database,
  FileCheck2,
  FileImage,
  FolderOpen,
  Gauge,
  Hammer,
  LayoutDashboard,
  Link2,
  ListFilter,
  Menu,
  Network,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  Wallet,
  X,
} from "lucide-react";

type View =
  | "overview"
  | "marketplace"
  | "create"
  | "submissions"
  | "datasets"
  | "profile";
type BountyStatus =
  | "Draft"
  | "Open"
  | "Review"
  | "Completed"
  | "Closing soon"
  | "Funded"
  | "Cancelled"
  | "Archived";
type SubmissionStatus =
  | "Accepted"
  | "Stored"
  | "Uploading"
  | "Needs review"
  | "Rejected"
  | "Disputed";

type Bounty = {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  collected: number;
  rewardPool: number;
  rewardPerSubmission: number;
  location: string;
  createdBy: string;
  createdAt: string;
  status: BountyStatus;
  minScore: number;
  tags: string[];
  chainId?: string;
  deadline?: number;
  license?: string;
  minimumScore?: number;
  escrowTxHash?: string;
  requester?: string;
};

type Submission = {
  id: string;
  bountyId: string;
  bountyTitle: string;
  fileName: string;
  submittedAt: string;
  status: SubmissionStatus;
  score: number | null;
  reward: number;
  hash: string;
  txHash: string;
  fingerprint?: string;
  checks: { label: string; value: string }[];
  reportHash?: string;
  validationExplanation?: string;
  validationModel?: string;
  settlementTxHash?: string;
  contributor?: string;
};

type Dataset = {
  id: string;
  name: string;
  version: string;
  items: number;
  category: string;
  license: string;
  status: string;
  progress: number;
  updated: string;
};

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "marketplace", label: "Marketplace", icon: Network },
  { id: "create", label: "Create bounty", icon: Plus },
  { id: "submissions", label: "My submissions", icon: ClipboardCheck },
  { id: "datasets", label: "Datasets", icon: Database },
];

const numberFormat = new Intl.NumberFormat("en-US");
const tokenNumberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});
const formatToken = (value: number) => `${tokenNumberFormat.format(value)} 0G`;
const GALILEO_CHAIN_ID = "0x40da";
const GALILEO_CHAIN = {
  chainId: GALILEO_CHAIN_ID,
  chainName: "0G Galileo Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: ["https://evmrpc-testnet.0g.ai"],
  blockExplorerUrls: ["https://chainscan-galileo.0g.ai"],
};
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
function formatCompact(value: number) {
  return value >= 1000
    ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    : numberFormat.format(value);
}
function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
function progressFor(bounty: Bounty) {
  return Math.min(100, Math.round((bounty.collected / bounty.target) * 100));
}

const chainBountyStatus: BountyStatus[] = [
  "Draft",
  "Open",
  "Review",
  "Completed",
  "Cancelled",
  "Archived",
];
const chainSubmissionStatus: SubmissionStatus[] = [
  "Needs review",
  "Accepted",
  "Rejected",
  "Disputed",
];

function parseBountyMetadata(metadata: string) {
  try {
    return JSON.parse(metadata) as {
      title?: string;
      description?: string;
      type?: string;
      location?: string;
      tags?: string[];
    };
  } catch {
    return {};
  }
}

async function readOnChainWorkspace() {
  const contract = publicContract();
  const bountyCount = Number(await contract.bountyCount());
  const nextBounties: Bounty[] = [];
  const titleById = new Map<string, string>();
  for (let id = 1; id <= bountyCount; id += 1) {
    const raw = await contract.getBounty(id);
    const metadata = parseBountyMetadata(String(raw.metadata));
    const status = chainBountyStatus[Number(raw.status)] ?? "Open";
    const bounty: Bounty = {
      id: String(id),
      title: metadata.title || `Bounty #${id}`,
      description: metadata.description || "On-chain DataForge collection",
      type: metadata.type || "Text",
      target: Number(raw.target),
      collected: Number(raw.accepted),
      rewardPool: Number(formatEther(raw.balance)),
      rewardPerSubmission: Number(formatEther(raw.reward)),
      location: metadata.location || "Global",
      createdBy: shortAddress(String(raw.requester)),
      requester: String(raw.requester),
      createdAt: "On-chain",
      status,
      minScore: Number(raw.minimumScore),
      tags: Array.isArray(metadata.tags) ? metadata.tags.slice(0, 3) : [],
      chainId: String(id),
      deadline: Number(raw.deadline),
      license: String(raw.license),
    };
    nextBounties.push(bounty);
    titleById.set(String(id), bounty.title);
  }
  const submissionCount = Number(await contract.submissionCount());
  const nextSubmissions: Submission[] = [];
  for (let id = 1; id <= submissionCount; id += 1) {
    const raw = await contract.getSubmission(id);
    const bountyId = String(raw.bountyId);
    const status = chainSubmissionStatus[Number(raw.status)] ?? "Needs review";
    nextSubmissions.push({
      id: String(id),
      bountyId,
      bountyTitle: titleById.get(bountyId) ?? `Bounty #${bountyId}`,
      fileName: String(raw.fileName),
      submittedAt: new Date(Number(raw.submittedAt) * 1000).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status,
      score: Number(raw.score),
      reward: status === "Accepted" ? Number(formatEther((await contract.getBounty(raw.bountyId)).reward)) : 0,
      hash: String(raw.rootHash),
      txHash: String(raw.storageTxHash),
      contributor: String(raw.contributor),
      reportHash: String(raw.reportHash),
      checks: [
        { label: "Merkle root", value: "Recorded" },
        { label: "Storage transaction", value: "Recorded" },
        { label: "Validation report", value: "Signed" },
        { label: "Settlement", value: status === "Accepted" ? "Released" : "Review" },
      ],
    });
  }
  return { bounties: nextBounties, submissions: nextSubmissions };
}

function DashboardHome() {
  const [view, setView] = useState<View>("overview");
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedBountyId, setSelectedBountyId] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [pendingUploadBountyId, setPendingUploadBountyId] = useState<
    string | null
  >(null);
  const [wallet, setWallet] = useState<{
    address: string;
    chainId: string;
  } | null>(null);
  const [notice, setNotice] = useState<{
    kind: "success" | "info" | "error";
    text: string;
  } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [networkBlock, setNetworkBlock] = useState<number | null>(null);
  const [networkUnavailable, setNetworkUnavailable] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const readBlock = async () => {
      try {
        const response = await fetch("https://evmrpc-testnet.0g.ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_blockNumber",
            params: [],
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error("RPC unavailable");
        const payload = (await response.json()) as { result?: string };
        if (!payload.result) throw new Error("Missing block number");
        setNetworkBlock(Number.parseInt(payload.result, 16));
        setNetworkUnavailable(false);
      } catch {
        setNetworkUnavailable(true);
      }
    };
    void readBlock();
    const interval = window.setInterval(readBlock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const ethereum = (
      window as Window & {
        ethereum?: {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        };
      }
    ).ethereum;
    if (!ethereum) return;
    void Promise.all([
      ethereum.request({ method: "eth_accounts" }),
      ethereum.request({ method: "eth_chainId" }),
    ])
      .then(([accountResult, chainResult]) => {
        const accounts = accountResult as string[];
        const chainId = String(chainResult);
        if (accounts[0] && chainId.toLowerCase() === GALILEO_CHAIN_ID) {
          setWallet({ address: accounts[0], chainId });
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const sync = async () => {
      try {
        const chain = await readOnChainWorkspace();
        if (!cancelled) {
          setBounties(chain.bounties);
          setSubmissions(chain.submissions);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice({
            kind: "info",
            text:
              error instanceof Error
                ? error.message
                : "The shared Galileo marketplace could not be loaded.",
          });
        }
      }
    };
    void sync();
    const interval = window.setInterval(sync, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hydrated]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const ethereum = (
      window as Window & {
        ethereum?: {
          on?: (event: string, handler: (...args: unknown[]) => void) => void;
          removeListener?: (
            event: string,
            handler: (...args: unknown[]) => void,
          ) => void;
        };
      }
    ).ethereum;
    if (!ethereum?.on) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = Array.isArray(args[0]) ? (args[0] as string[]) : [];
      setWallet((current) =>
        accounts[0] && current ? { ...current, address: accounts[0] } : null,
      );
    };
    const handleChainChanged = (...args: unknown[]) => {
      const nextChainId = String(args[0] ?? "");
      setWallet((current) =>
        current && nextChainId.toLowerCase() === GALILEO_CHAIN_ID
          ? { ...current, chainId: nextChainId }
          : null,
      );
    };
    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);
    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const selectedBounty =
    bounties.find((bounty) => bounty.id === selectedBountyId) ?? bounties[0];
  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ??
    submissions[0];
  const datasets = useMemo<Dataset[]>(
    () =>
      bounties.map((bounty) => {
        const storedItems = submissions.filter(
          (submission) =>
            submission.bountyId === bounty.id &&
            (submission.status === "Stored" || submission.status === "Accepted"),
        ).length;
        return {
          id: bounty.id,
          name: bounty.title,
          version: "Live",
          items: storedItems,
          category: bounty.type,
          license: "Not specified",
          status: storedItems >= bounty.target ? "Verified" : "Collecting",
          progress: bounty.target
            ? Math.min(100, Math.round((storedItems / bounty.target) * 100))
            : 0,
          updated: storedItems ? "this session" : "not yet",
        };
      }),
    [bounties, submissions],
  );
  const acceptedSubmissions = submissions.filter(
    (submission) => submission.status === "Accepted",
  );
  const totalEarned = acceptedSubmissions.reduce(
    (total, submission) => total + submission.reward,
    0,
  );
  const averageQuality = acceptedSubmissions.length
    ? Math.round(
        acceptedSubmissions.reduce(
          (total, submission) => total + (submission.score ?? 0),
          0,
        ) / acceptedSubmissions.length,
      )
    : 0;
  const changeView = (nextView: View) => {
    setView(nextView);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const connectWallet = async () => {
    const ethereum = (
      window as Window & {
        ethereum?: {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        };
      }
    ).ethereum;
    if (!ethereum) {
      setNotice({
        kind: "info",
        text: "No injected wallet found. You can browse the empty workspace, but 0G uploads require a wallet.",
      });
      return false;
    }
    try {
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      let chainId = String(await ethereum.request({ method: "eth_chainId" }));
      if (chainId.toLowerCase() !== GALILEO_CHAIN_ID) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: GALILEO_CHAIN_ID }],
          });
          chainId = String(await ethereum.request({ method: "eth_chainId" }));
        } catch (switchError) {
          const errorCode =
            typeof switchError === "object" && switchError !== null && "code" in switchError
              ? Number((switchError as { code?: unknown }).code)
              : undefined;
          if (errorCode === 4902) {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [GALILEO_CHAIN],
            });
            chainId = String(await ethereum.request({ method: "eth_chainId" }));
          } else {
            setNotice({
              kind: "info",
              text: "Your wallet is on another network. Switch to 0G Galileo (chain 16602) to submit data.",
            });
            return false;
          }
        }
      }
      if (accounts[0]) {
        setWallet({ address: accounts[0], chainId });
        setNotice({
          kind: "success",
          text: `Wallet connected as ${shortAddress(accounts[0])}.`,
        });
        return true;
      }
      return false;
    } catch {
      setNotice({
        kind: "error",
        text: "Wallet connection was cancelled. Try again when you are ready.",
      });
      return false;
    }
  };
  const startFromLanding = async () => {
    const connected = await connectWallet();
    if (connected) {
      window.history.pushState({}, "", "/dashboard");
      setShowLanding(false);
      setView("overview");
    }
  };
  useEffect(() => {
    setShowLanding(window.location.pathname !== "/dashboard");
    const handlePopState = () => setShowLanding(window.location.pathname !== "/dashboard");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  if (showLanding) return <LandingPage onGetStarted={startFromLanding} />;

  const handleCreatedBounty = async (bounty: Bounty) => {
    const ethereum = getEthereum();
    if (!ethereum || !wallet) {
      setNotice({ kind: "error", text: "Connect a Galileo wallet before publishing." });
      return;
    }
    try {
      const contract = await contractWrite(ethereum);
      const deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      const metadata = JSON.stringify({
        title: bounty.title,
        description: bounty.description,
        type: bounty.type,
        location: bounty.location,
        tags: bounty.tags,
      });
      const target = BigInt(bounty.target);
      const reward = parseReward(String(bounty.rewardPerSubmission));
      const escrow = target * reward;
      const balance = await getWalletBalance(ethereum, wallet.address);
      if (balance <= escrow) {
        throw new Error(
          `Insufficient Galileo balance. This bounty needs ${formatToken(Number(formatEther(escrow)))} plus gas, but this wallet has ${formatToken(Number(formatEther(balance)))}. Reduce the target or reward, or fund the wallet first.`,
        );
      }
      const tx = await contract.createAndPublish(
        metadata,
        bounty.license ?? "CC-BY-4.0",
        target,
        reward,
        deadline,
        bounty.minScore || 70,
        { value: escrow },
      );
      const receipt = await waitForTransaction(tx);
      const chain = await readOnChainWorkspace();
      setBounties(chain.bounties);
      setSubmissions(chain.submissions);
      const created = chain.bounties
        .filter((item) => item.createdBy === shortAddress(wallet.address))
        .sort((a, b) => Number(b.id) - Number(a.id))[0];
      if (created) setSelectedBountyId(created.id);
      setNotice({ kind: "success", text: `Bounty published on Galileo in ${receipt.hash.slice(0, 10)}…` });
      changeView("marketplace");
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "The bounty could not be published on Galileo.",
      });
    }
  };
  const handleSubmitted = async (submission: Submission) => {
    const chain = await readOnChainWorkspace();
    setBounties(chain.bounties);
    setSubmissions(chain.submissions);
    setSelectedSubmissionId(submission.id);
    setNotice({
      kind: "success",
      text:
        submission.status === "Accepted"
          ? "File stored and reward released on Galileo."
          : "File stored on 0G and sent to requester review.",
    });
    changeView("submissions");
  };
  const reviewOnChain = async (submissionId: string, accept: boolean) => {
    const ethereum = getEthereum();
    if (!ethereum) return;
    try {
      const contract = await contractWrite(ethereum);
      const tx = await contract.reviewSubmission(BigInt(submissionId), accept);
      await waitForTransaction(tx);
      const chain = await readOnChainWorkspace();
      setBounties(chain.bounties);
      setSubmissions(chain.submissions);
      setNotice({ kind: "success", text: accept ? "Submission accepted and paid on Galileo." : "Submission rejected on Galileo." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "The review transaction failed." });
    }
  };
  const disputeOnChain = async (submissionId: string) => {
    const ethereum = getEthereum();
    if (!ethereum) return;
    try {
      const contract = await contractWrite(ethereum);
      const reasonHash = keccak256(toUtf8Bytes("Contributor requests requester review of this decision."));
      const tx = await contract.openDispute(BigInt(submissionId), reasonHash);
      await waitForTransaction(tx);
      const chain = await readOnChainWorkspace();
      setBounties(chain.bounties);
      setSubmissions(chain.submissions);
      setNotice({ kind: "success", text: "Dispute opened on Galileo." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "The dispute transaction failed." });
    }
  };
  const downloadManifest = (dataset: Dataset) => {
    const receipts = submissions
      .filter((submission) => submission.bountyId === dataset.id)
      .map((submission) => ({
        fileName: submission.fileName,
        rootHash: submission.hash,
        transactionHash: submission.txHash,
        submittedAt: submission.submittedAt,
      }));
    const manifest = {
      name: dataset.name,
      version: dataset.version,
      items: dataset.items,
      license: dataset.license,
      generatedAt: new Date().toISOString(),
      provenance: "DataForge / 0G Galileo testnet",
      receipts,
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${dataset.id}-manifest.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice({ kind: "success", text: "Manifest downloaded." });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="mobile-menu-button"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <Menu size={19} />
          </button>
          <button
            className="brand"
            onClick={() => changeView("overview")}
            aria-label="Go to overview"
          >
            <span className="brand-mark">
              <Hammer size={17} strokeWidth={2.2} />
            </span>
            <span>
              DataForge
            </span>
          </button>
          <span
            className={`network-badge ${networkUnavailable ? "network-badge-offline" : ""}`}
            title="Live block height from the 0G Galileo RPC"
          >
            <span className="status-dot" />
            {networkUnavailable
              ? "Galileo unavailable"
              : networkBlock
                ? `Galileo · #${numberFormat.format(networkBlock)}`
                : "Checking Galileo"}
          </span>
        </div>
        <div className="topbar-actions">
          <button
            className={`wallet-button ${wallet ? "wallet-button-connected" : ""}`}
            onClick={connectWallet}
          >
            <Wallet size={16} />
            <span>
              {wallet ? shortAddress(wallet.address) : "Connect wallet"}
            </span>
          </button>
        </div>
      </header>
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-label">Workspace</div>
        <nav aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${view === item.id ? "nav-item-active" : ""}`}
                onClick={() => changeView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.id === "submissions" &&
                submissions.some(
                  (submission) => submission.status === "Uploading",
                ) ? (
                  <span className="nav-count">1</span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="dataforge-card">
          <div className="dataforge-icon">
            <ShieldCheck size={17} />
          </div>
          <div>
            <strong>DataForge</strong>
            <span>Proof verification ready</span>
          </div>
          <span className="status-dot" />
        </div>
        <button
          className={`nav-item ${view === "profile" ? "nav-item-active" : ""}`}
          onClick={() => changeView("profile")}
        >
          <Settings2 size={18} />
          <span>Profile & settings</span>
        </button>
        <div className="sidebar-footer">
          Built for the 0G ecosystem<span>Galileo testnet</span>
        </div>
      </aside>
      <main className="main-content">
        {notice ? (
          <div className={`notice notice-${notice.kind}`} role="status">
            <span>
              {notice.kind === "success" ? (
                <Check size={16} />
              ) : notice.kind === "error" ? (
                <X size={16} />
              ) : (
                <Sparkles size={16} />
              )}
            </span>
            {notice.text}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice(null)}
            >
              <X size={14} />
            </button>
          </div>
        ) : null}
        {view === "overview" ? (
          <OverviewView
            bounties={bounties}
            submissions={submissions}
            totalEarned={totalEarned}
            averageQuality={averageQuality}
            onView={changeView}
          />
        ) : null}
        {view === "marketplace" ? (
          <MarketplaceView
            bounties={bounties}
            onView={changeView}
            onSelectBounty={(id) => {
              setSelectedBountyId(id);
              setPendingUploadBountyId(id);
              changeView("submissions");
            }}
          />
        ) : null}
        {view === "create" ? (
          <CreateBountyView
            onCreated={handleCreatedBounty}
            walletAddress={wallet?.address}
            onConnect={connectWallet}
          />
        ) : null}
        {view === "submissions" ? (
          <SubmissionsView
            submissions={submissions}
            selected={selectedSubmission}
            selectedBounty={selectedBounty}
            bounties={bounties}
            onSelect={setSelectedSubmissionId}
            onView={changeView}
            onSubmitted={handleSubmitted}
            walletAddress={wallet?.address}
            onReview={reviewOnChain}
            onDispute={disputeOnChain}
            initialUploadOpen={Boolean(pendingUploadBountyId)}
            onUploadClosed={() => setPendingUploadBountyId(null)}
          />
        ) : null}
        {view === "datasets" ? (
          <DatasetsView datasets={datasets} onDownload={downloadManifest} />
        ) : null}
        {view === "profile" ? (
          <ProfileView
            wallet={wallet}
            onConnect={connectWallet}
            submissions={submissions}
          />
        ) : null}
      </main>
    </div>
  );
}

export default DashboardHome;

function ViewHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="view-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="view-description">{description}</p> : null}
      </div>
      {action ? <div className="view-header-action">{action}</div> : null}
    </div>
  );
}

function OverviewView({
  bounties,
  submissions,
  totalEarned,
  averageQuality,
  onView,
}: {
  bounties: Bounty[];
  submissions: Submission[];
  totalEarned: number;
  averageQuality: number;
  onView: (view: View) => void;
}) {
  const activeBounties = bounties.filter(
    (bounty) => bounty.status === "Open" || bounty.status === "Review" || bounty.status === "Closing soon",
  );
  return (
    <div className="view animate-enter">
      <ViewHeader
        eyebrow="Your workspace"
        title="Welcome back"
        description="A clear view of the bounties, wallet-signed uploads, and proof receipts in this workspace."
        action={
          <button
            className="button button-primary"
            onClick={() => onView("create")}
          >
            <Plus size={17} /> Create bounty
          </button>
        }
      />
      <section className="stats-grid" aria-label="Workspace metrics">
        <MetricCard
          label="Active bounties"
          value={numberFormat.format(activeBounties.length)}
          trend={`${activeBounties.length} collecting now`}
          icon={<Network size={18} />}
        />
        <MetricCard
          label="Stored items"
          value={formatCompact(
            submissions.filter(
              (submission) =>
                submission.status === "Stored" || submission.status === "Accepted",
            ).length,
          )}
          trend={`${bounties.length} dataset${bounties.length === 1 ? "" : "s"}`}
          icon={<BadgeCheck size={18} />}
        />
        <MetricCard
          label="Total earned"
          value={formatToken(totalEarned)}
          trend={`${submissions.filter((item) => item.reward > 0).length} paid submissions`}
          icon={<BarChart3 size={18} />}
        />
        <MetricCard
          label="Average quality"
          value={averageQuality ? `${averageQuality}/100` : "—"}
          trend={averageQuality ? "From accepted submissions" : "No accepted scores yet"}
          icon={<Gauge size={18} />}
        />
      </section>
      <div className="overview-grid">
        <section className="panel progress-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Collection progress</p>
              <h2>Keep the pipeline moving</h2>
            </div>
            <button
              className="text-button"
              onClick={() => onView("marketplace")}
            >
              Explore bounties <ArrowRight size={15} />
            </button>
          </div>
          <div className="progress-list">
            {activeBounties.length ? activeBounties.slice(0, 3).map((bounty) => (
              <div className="progress-row" key={bounty.id}>
                <div className="progress-meta">
                  <span>{bounty.title}</span>
                  <strong>{progressFor(bounty)}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${progressFor(bounty)}%` }} />
                </div>
                <div className="progress-submeta">
                  <span>
                    {numberFormat.format(bounty.collected)} of{" "}
                    {numberFormat.format(bounty.target)} items
                  </span>
                  <span>{formatToken(bounty.rewardPool)} pool</span>
                </div>
              </div>
            )) : (
              <EmptyState
                title="No bounties yet"
                description="Create your first real bounty to start collecting data."
                action={
                  <button className="button button-secondary" onClick={() => onView("create")}>
                    Create bounty
                  </button>
                }
              />
            )}
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Latest activity</p>
              <h2>Recent submissions</h2>
            </div>
            <button
              className="icon-button subtle"
              aria-label="View all submissions"
              onClick={() => onView("submissions")}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="activity-list">
            {submissions.length ? submissions.slice(0, 3).map((submission) => (
              <button
                className="activity-row"
                key={submission.id}
                onClick={() => onView("submissions")}
              >
                <span className="file-icon">
                  <FileImage size={16} />
                </span>
                <span className="activity-copy">
                  <strong>{submission.fileName}</strong>
                  <small>{submission.bountyTitle}</small>
                </span>
                <span
                  className={`status status-${submission.status.toLowerCase().replaceAll(" ", "-")}`}
                >
                  <span className="status-dot" />
                  {submission.status}
                </span>
              </button>
            )) : (
              <EmptyState
                title="No submissions yet"
                description="Stored contributions and their 0G receipts will appear here."
              />
            )}
          </div>
        </section>
      </div>
      <section className="callout-row">
        <div className="callout-icon">
          <ShieldCheck size={20} />
        </div>
        <div>
          <strong>Proofs before promises</strong>
          <p>
            Each uploaded item records the real 0G Storage root and transaction
            before it appears in your workspace.
          </p>
        </div>
        <button className="text-button" onClick={() => onView("submissions")}>
          Review proofs <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-trend">{trend}</span>
    </article>
  );
}

function MarketplaceView({
  bounties,
  onView,
  onSelectBounty,
}: {
  bounties: Bounty[];
  onView: (view: View) => void;
  onSelectBounty: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All types");
  const filtered = useMemo(
    () =>
      bounties.filter(
        (bounty) =>
          (bounty.status === "Open" || bounty.status === "Review" || bounty.status === "Closing soon") &&
          `${bounty.title} ${bounty.description} ${bounty.tags.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (filter === "All types" || bounty.type === filter),
      ),
    [bounties, filter, query],
  );
  return (
    <div className="view animate-enter">
      <ViewHeader
        eyebrow="Open network"
        title="Find work worth doing"
        description="Contribute useful data to teams building the next generation of AI."
        action={
          <button
            className="button button-primary"
            onClick={() => onView("create")}
          >
            <Plus size={17} /> Create bounty
          </button>
        }
      />
      <div className="market-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bounties"
            aria-label="Search bounties"
          />
        </label>
        <label className="filter-field">
          <ListFilter size={16} />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter bounties by data type"
          >
            <option>All types</option>
            <option>Images</option>
            <option>Audio</option>
            <option>Text</option>
          </select>
        </label>
        <span className="result-count">{filtered.length} opportunities</span>
      </div>
      {filtered.length ? (
        <div className="bounty-grid">
          {filtered.map((bounty) => (
            <BountyCard
              key={bounty.id}
              bounty={bounty}
              onContribute={() => onSelectBounty(bounty.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={bounties.length ? "No bounties match that search" : "No live bounties yet"}
          description={
            bounties.length
              ? "Try another keyword or clear the type filter."
              : "Create the first bounty for this workspace. No sample records are shown."
          }
          action={
            <button
              className="button button-secondary"
              onClick={() => {
                if (bounties.length) {
                  setQuery("");
                  setFilter("All types");
                } else {
                  onView("create");
                }
              }}
            >
              {bounties.length ? "Clear filters" : "Create bounty"}
            </button>
          }
        />
      )}
    </div>
  );
}

function BountyCard({
  bounty,
  onContribute,
}: {
  bounty: Bounty;
  onContribute: () => void;
}) {
  const progress = progressFor(bounty);
  const canContribute = bounty.status === "Open" || bounty.status === "Review" || bounty.status === "Closing soon";
  return (
    <article className="bounty-card">
      <div className="bounty-card-top">
        <span className="type-label">
          <FileImage size={14} /> {bounty.type}
        </span>
        <span
          className={`bounty-status bounty-status-${bounty.status.toLowerCase().replace(" ", "-")}`}
        >
          {bounty.status}
        </span>
      </div>
      <h2>{bounty.title}</h2>
      <p>{bounty.description}</p>
      <div className="tag-list">
        {bounty.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="bounty-stats">
        <div>
          <small>Reward / item</small>
          <strong>{formatToken(bounty.rewardPerSubmission)}</strong>
        </div>
        <div>
          <small>Collected</small>
          <strong>
            {formatCompact(bounty.collected)} / {formatCompact(bounty.target)}
          </strong>
        </div>
        <div>
          <small>From</small>
          <strong>{bounty.location}</strong>
        </div>
      </div>
      <div className="card-progress">
        <div className="progress-meta">
          <span>{progress}% complete</span>
          <span>{formatToken(bounty.rewardPool)} pool</span>
        </div>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="bounty-card-footer">
        <span className="creator">
          <span className="creator-avatar">{bounty.createdBy.slice(0, 1)}</span>
          {bounty.createdBy}
        </span>
        <button
          className="button button-small button-primary"
          onClick={onContribute}
          disabled={!canContribute}
        >
          {canContribute ? "Contribute" : bounty.status} <ArrowRight size={14} />
        </button>
      </div>
    </article>
  );
}

function CreateBountyView({
  onCreated,
  walletAddress,
  onConnect,
}: {
  onCreated: (bounty: Bounty) => void;
  walletAddress?: string;
  onConnect: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "Images",
    target: "",
    rewardPerSubmission: "",
    location: "",
    tags: "",
  });
  const [error, setError] = useState("");
  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const targetCount = Number(form.target) || 0;
  const rewardPerItem = Number(form.rewardPerSubmission) || 0;
  const requiredPool = targetCount * rewardPerItem;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!walletAddress) {
      setError("Connect a 0G Galileo wallet before creating a bounty.");
      return;
    }
    if (!form.title.trim() || !form.description.trim() || targetCount < 1 || rewardPerItem <= 0) {
      setError(
        "Complete the title, description, target, and reward per item with positive values.",
      );
      return;
    }
    const now = new Date();
    onCreated({
      id: `bounty-${now.getTime()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      target: Number(form.target),
      collected: 0,
      rewardPool: requiredPool,
      rewardPerSubmission: Number(form.rewardPerSubmission),
      location: form.location,
      createdBy: walletAddress ? shortAddress(walletAddress) : "Unconnected wallet",
      createdAt: now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status: "Open",
      minScore: 0,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 3),
    });
  };
  return (
    <div className="view animate-enter narrow-view">
      <ViewHeader
        eyebrow="Requester tools"
        title="Create a data bounty"
        description="Set clear acceptance rules and let the network bring useful data to your model."
        action={
          !walletAddress ? (
            <button className="button button-secondary" onClick={onConnect}>
              <Wallet size={16} /> Connect wallet
            </button>
          ) : undefined
        }
      />
      <form className="form-layout" onSubmit={submit} noValidate>
        <section className="panel form-panel">
          <div className="form-section-heading">
            <span className="step-number">01</span>
            <div>
              <h2>Describe the work</h2>
              <p>Contributors should understand the request in one pass.</p>
            </div>
          </div>
          <div className="field-grid">
            <Field label="Bounty title" hint="A clear, specific name" required>
              <input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="e.g. Night-time traffic images"
              />
            </Field>
            <Field label="Data type" required>
              <select
                value={form.type}
                onChange={(event) => update("type", event.target.value)}
              >
                <option>Images</option>
                <option>Audio</option>
                <option>Text</option>
                <option>Structured data</option>
              </select>
            </Field>
          </div>
          <Field
            label="Description"
            hint="Include what makes a submission useful"
            required
          >
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="We need clear, original images of…"
              rows={4}
            />
          </Field>
          <div className="field-grid">
            <Field label="Location or language">
              <input
                value={form.location}
                onChange={(event) => update("location", event.target.value)}
                placeholder="India, English, global…"
              />
            </Field>
            <Field label="Tags" hint="Separate with commas">
              <input
                value={form.tags}
                onChange={(event) => update("tags", event.target.value)}
                placeholder="Computer vision, roads"
              />
            </Field>
          </div>
        </section>
        <section className="panel form-panel">
          <div className="form-section-heading">
            <span className="step-number">02</span>
            <div>
              <h2>Set the reward</h2>
              <p>Rewards are shown before someone contributes.</p>
            </div>
          </div>
          <div className="field-grid three">
            <Field label="Target items" required>
              <input
                type="number"
                min="1"
                value={form.target}
                onChange={(event) => update("target", event.target.value)}
                placeholder="10000"
              />
            </Field>
            <Field label="Required escrow (0G)" hint="Target × reward" required>
              <input
                type="number"
                value={requiredPool || ""}
                placeholder="Calculated automatically"
                readOnly
                aria-readonly="true"
              />
            </Field>
            <Field label="Reward per item (0G)" required>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.rewardPerSubmission}
                onChange={(event) =>
                  update("rewardPerSubmission", event.target.value)
                }
                placeholder="0.20"
              />
            </Field>
          </div>
          <div className={`reward-calculation ${requiredPool > 0 ? "reward-calculation-ok" : ""}`} role="status" aria-live="polite">
            <span>Required escrow</span>
            <strong>{requiredPool > 0 ? `${tokenNumberFormat.format(requiredPool)} 0G` : "Enter target and reward"}</strong>
            <small>
              {requiredPool > 0 ? "Locked in escrow when published" : "Target × reward per item"}
            </small>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-actions">
            <span className="form-note">
              <FileCheck2 size={15} /> Contributions use wallet-signed 0G Storage uploads
            </span>
            <button className="button button-primary" type="submit">
              Launch bounty <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>
        <strong>
          {label}
          {required ? <b aria-hidden="true"> *</b> : null}
        </strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

function SubmissionsView({
  submissions,
  selected,
  selectedBounty,
  bounties,
  onSelect,
  onView,
  onSubmitted,
  walletAddress,
  onReview,
  onDispute,
  initialUploadOpen,
  onUploadClosed,
}: {
  submissions: Submission[];
  selected?: Submission;
  selectedBounty?: Bounty;
  bounties: Bounty[];
  onSelect: (id: string) => void;
  onView: (view: View) => void;
  onSubmitted: (submission: Submission) => void;
  walletAddress?: string;
  onReview: (submissionId: string, accept: boolean) => void;
  onDispute: (submissionId: string) => void;
  initialUploadOpen: boolean;
  onUploadClosed: () => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(initialUploadOpen);
  const closeUpload = () => {
    setUploadOpen(false);
    onUploadClosed();
  };
  return (
    <div className="view animate-enter">
      <ViewHeader
        eyebrow="Your contribution trail"
        title="My submissions"
        description="Every stored file keeps its real Merkle root and 0G transaction receipt."
        action={
          bounties.length ? (
            <button
              className="button button-primary"
              onClick={() => setUploadOpen(true)}
            >
              <Upload size={16} /> Submit data
            </button>
          ) : (
            <button className="button button-primary" onClick={() => onView("create")}>
              <Plus size={16} /> Create a bounty first
            </button>
          )
        }
      />
      <div className="submission-layout">
        <section className="panel submission-list-panel">
          <div className="panel-heading">
            <div>
              <h2>Submission history</h2>
              <p>{submissions.length} files in this workspace</p>
            </div>
            <span className="live-label">
              <span className="status-dot" /> Live
            </span>
          </div>
          <div className="submission-list">
            {submissions.map((submission) => (
              <button
                key={submission.id}
                className={`submission-row ${selected?.id === submission.id ? "submission-row-active" : ""}`}
                onClick={() => onSelect(submission.id)}
              >
                <span className="file-icon">
                  <FileImage size={16} />
                </span>
                <span className="submission-main">
                  <strong>{submission.fileName}</strong>
                  <small>{submission.bountyTitle}</small>
                </span>
                <span className="submission-date">
                  {submission.submittedAt}
                </span>
                <span
                  className={`status status-${submission.status.toLowerCase().replaceAll(" ", "-")}`}
                >
                  <span className="status-dot" />
                  {submission.status}
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </section>
        <SubmissionDetail
          submission={selected}
          onView={onView}
          walletAddress={walletAddress}
          bounty={bounties.find((item) => item.id === selected?.bountyId)}
          onReview={onReview}
          onDispute={onDispute}
        />
      </div>
      {uploadOpen ? (
        <UploadPanel
          bounties={bounties}
          defaultBounty={selectedBounty}
          knownFingerprints={submissions
            .map((submission) => submission.fingerprint)
            .filter((value): value is string => Boolean(value))}
          walletAddress={walletAddress}
          onClose={closeUpload}
          onSubmit={(submission) => {
            closeUpload();
            onSubmitted(submission);
          }}
        />
      ) : null}
    </div>
  );
}

function SubmissionDetail({
  submission,
  onView,
  walletAddress,
  bounty,
  onReview,
  onDispute,
}: {
  submission?: Submission;
  onView: (view: View) => void;
  walletAddress?: string;
  bounty?: Bounty;
  onReview: (submissionId: string, accept: boolean) => void;
  onDispute: (submissionId: string) => void;
}) {
  if (!submission)
    return (
      <EmptyState
        title="Select a submission"
        description="Choose a file from your history to inspect its storage proof."
      />
    );
  return (
    <section className="panel detail-panel">
      <div className="detail-header">
        <div className="file-icon large">
          <FileImage size={20} />
        </div>
        <div>
          <p className="eyebrow">Validation record</p>
          <h2>{submission.fileName}</h2>
          <span>{submission.bountyTitle}</span>
        </div>
        <span
          className={`status status-${submission.status.toLowerCase().replaceAll(" ", "-")}`}
        >
          <span className="status-dot" />
          {submission.status}
        </span>
      </div>
      {submission.score !== null ? (
        <div className="score-block">
          <div>
            <span>Overall quality score</span>
            <strong>
              {submission.score}
              <small>/100</small>
            </strong>
          </div>
          <div
            className="score-ring"
            style={
              {
                "--score": `${submission.score * 3.6}deg`,
              } as React.CSSProperties
            }
          >
            <span>{submission.score}</span>
          </div>
        </div>
      ) : submission.status === "Uploading" ? (
        <div className="verification-loading">
          <span className="loading-bar" />
          <p>The wallet and 0G Storage network are processing this file.</p>
        </div>
      ) : (
        <div className="proof-ready">
          <ShieldCheck size={18} />
          <div>
            <strong>Storage proof recorded</strong>
            <p>This receipt comes from the real 0G Storage upload.</p>
          </div>
        </div>
      )}
      <div className="check-list">
        {submission.checks.map((check) => (
          <div className="check-row" key={check.label}>
            <span className="check-icon">
              <Check size={14} />
            </span>
            <span>{check.label}</span>
            <strong>{check.value}</strong>
          </div>
        ))}
      </div>
      <div className="provenance-block">
        <div>
          <span>0G Storage root</span>
          <strong>{submission.hash}</strong>
        </div>
        <button
          className="icon-button subtle"
          aria-label="Copy content hash"
          onClick={() => navigator.clipboard?.writeText(submission.hash)}
        >
          <Link2 size={16} />
        </button>
      </div>
      <div className="proof-actions" aria-label="Provenance proof links">
        <a
          className="button button-secondary"
          href="https://storagescan-galileo.0g.ai/"
          target="_blank"
          rel="noreferrer"
        >
          Open StorageScan <ArrowRight size={14} />
        </a>
        <a
          className="button button-secondary"
          href={`https://chainscan-galileo.0g.ai/tx/${submission.txHash}`}
          target="_blank"
          rel="noreferrer"
        >
          View transaction <ArrowRight size={14} />
        </a>
      </div>
      {submission.validationExplanation ? (
        <div className="profile-tip">
          <ShieldCheck size={17} />
          <div>
            <strong>Validator note</strong>
            <p>{submission.validationExplanation}</p>
            {submission.validationModel ? <small>Model: {submission.validationModel}</small> : null}
          </div>
        </div>
      ) : null}
      {submission.status === "Needs review" && bounty?.requester?.toLowerCase() === walletAddress?.toLowerCase() ? (
        <div className="proof-actions" aria-label="Requester review actions">
          <button className="button button-primary" onClick={() => onReview(submission.id, true)}>
            Accept and pay <ArrowRight size={14} />
          </button>
          <button className="button button-secondary" onClick={() => onReview(submission.id, false)}>
            Reject
          </button>
        </div>
      ) : null}
      {(submission.status === "Rejected" || submission.status === "Needs review") &&
      submission.contributor?.toLowerCase() === walletAddress?.toLowerCase() ? (
        <button className="text-button" onClick={() => onDispute(submission.id)}>
          Open dispute <ArrowRight size={14} />
        </button>
      ) : null}
      {submission.status === "Accepted" ? (
        <div className="reward-banner">
          <div className="reward-icon">
            <BadgeCheck size={18} />
          </div>
          <div>
            <strong>Reward released</strong>
            <span>
              {formatToken(submission.reward)} confirmed by the
              settlement transaction
            </span>
          </div>
          <button className="text-button" onClick={() => onView("profile")}>
            View earnings <ArrowRight size={14} />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function UploadPanel({
  bounties,
  defaultBounty,
  knownFingerprints,
  walletAddress,
  onClose,
  onSubmit,
}: {
  bounties: Bounty[];
  defaultBounty?: Bounty;
  knownFingerprints: string[];
  walletAddress?: string;
  onClose: () => void;
  onSubmit: (submission: Submission) => void;
}) {
  const [bountyId, setBountyId] = useState(
    defaultBounty?.id ?? bounties[0]?.id ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const bounty = bounties.find((item) => item.id === bountyId) ?? bounties[0];
  const acceptedFileTypes =
    bounty?.type === "Images"
      ? "image/*"
      : bounty?.type === "Audio"
        ? "audio/*"
        : bounty?.type === "Structured data"
          ? ".json,.csv"
          : ".txt,.json,.csv,text/*";
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploading) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, uploading]);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !bounty) {
      setError("Choose a file and a bounty before submitting.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("This file is larger than 25 MB. Choose a smaller file.");
      return;
    }
    const isExpectedType =
      (bounty.type === "Images" && file.type.startsWith("image/")) ||
      (bounty.type === "Audio" && file.type.startsWith("audio/")) ||
      (bounty.type === "Text" &&
        (file.type.startsWith("text/") ||
          file.name.toLowerCase().endsWith(".json"))) ||
      (bounty.type === "Structured data" &&
        [".json", ".csv"].some((extension) =>
          file.name.toLowerCase().endsWith(extension),
        ));
    if (!isExpectedType) {
      setError(`Choose a ${bounty.type.toLowerCase()} file for this bounty.`);
      return;
    }
    const ethereum = (
      window as Window & {
        ethereum?: {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        };
      }
    ).ethereum;
    if (!ethereum) {
      setError("Install or enable an EVM wallet to sign this 0G Storage upload.");
      return;
    }
    try {
      setUploading(true);
      setError("");
      const chainId = String(await ethereum.request({ method: "eth_chainId" }));
      if (chainId.toLowerCase() !== GALILEO_CHAIN_ID) {
        throw new Error("Connect your wallet to 0G Galileo before uploading.");
      }
      setUploadStatus("Checking for an identical local contribution…");
      const fingerprint = await fingerprintFile(file);
      if (knownFingerprints.includes(fingerprint)) {
        throw new Error("This exact file is already in your contribution history.");
      }
      const receipt = await uploadToZeroG(file, ethereum, setUploadStatus);
      if (!walletAddress) throw new Error("Connect the contributor wallet before submitting.");
      setUploadStatus("Running the DataForge quality check…");
      const validationForm = new FormData();
      validationForm.append("file", file);
      validationForm.append("bountyId", bounty.id);
      validationForm.append("contributor", walletAddress);
      validationForm.append("rootHash", receipt.rootHash);
      validationForm.append("storageTxHash", receipt.txHash);
      validationForm.append("fingerprint", fingerprint);
      const validationResponse = await fetch("/api/validate", {
        method: "POST",
        body: validationForm,
        signal: AbortSignal.timeout(35_000),
      });
      const validation = (await validationResponse.json()) as {
        error?: string;
        score: number;
        decision: "accept" | "review";
        explanation: string;
        reportHash: string;
        issuedAt: number;
        signature: string;
        model: string;
      };
      if (!validationResponse.ok) throw new Error(validation.error || "The validator could not assess this contribution.");
      setUploadStatus("Submitting the proof and settlement policy to Galileo…");
      const contract = await contractWrite(ethereum);
      const tx = await contract.submitProof(
        BigInt(bounty.id),
        receipt.rootHash,
        receipt.txHash,
        fingerprint,
        validation.score,
        validation.reportHash,
        validation.issuedAt,
        validation.signature,
        file.name,
      );
      const settlementReceipt = await waitForTransaction(tx);
      const accepted = validation.decision === "accept" && validation.score >= (bounty.minScore || 70);
      onSubmit({
        id: String(bounty.id) + ":" + receipt.rootHash,
        bountyId: bounty.id,
        bountyTitle: bounty.title,
        fileName: file.name,
        submittedAt: new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: accepted ? "Accepted" : "Needs review",
        score: validation.score,
        reward: accepted ? bounty.rewardPerSubmission : 0,
        hash: receipt.rootHash,
        txHash: receipt.txHash,
        fingerprint,
        reportHash: validation.reportHash,
        validationExplanation: validation.explanation,
        validationModel: validation.model,
        settlementTxHash: accepted ? settlementReceipt.hash : undefined,
        checks: [
          { label: "Merkle root", value: "Generated" },
          { label: "Storage network", value: "0G Turbo" },
          { label: "Wallet signature", value: "Confirmed" },
          { label: "Quality report", value: validation.decision === "accept" ? "Accepted" : "Review" },
          { label: "Settlement receipt", value: accepted ? "Released" : "Pending review" },
        ],
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The 0G upload could not be completed.",
      );
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  };
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Contribution</p>
            <h2 id="upload-title">Submit a file</h2>
          </div>
          <button
            className="icon-button subtle"
            onClick={onClose}
            aria-label="Close upload dialog"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <Field label="Choose a bounty" required>
            <select
              value={bountyId}
              onChange={(event) => setBountyId(event.target.value)}
            >
              {bounties
                .filter((item) => item.status === "Open" || item.status === "Review" || item.status === "Closing soon")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
            </select>
          </Field>
          <label className={`dropzone ${file ? "dropzone-has-file" : ""}`}>
            <input
              type="file"
              accept={acceptedFileTypes}
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                setError(
                  nextFile && nextFile.size > MAX_UPLOAD_BYTES
                    ? "This file is larger than 25 MB. Choose a smaller file."
                    : "",
                );
              }}
            />
            {file ? (
              <>
                <span className="dropzone-icon">
                  <FileCheck2 size={21} />
                </span>
                <strong>{file.name}</strong>
                <small>
                  {(file.size / 1024).toFixed(1)} KB ready for storage
                </small>
              </>
            ) : (
              <>
                <span className="dropzone-icon">
                  <CloudUpload size={21} />
                </span>
                <strong>Drop your data here</strong>
                <small>Images, audio, text, JSON, or CSV up to 25 MB</small>
                <span className="browse-link">Browse files</span>
              </>
            )}
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {uploadStatus ? (
            <p className="upload-status" role="status">
              {uploadStatus}
            </p>
          ) : null}
          <div className="modal-footer">
            <span className="form-note">
              <ShieldCheck size={15} /> Your wallet signs every storage upload
            </span>
            <button
              className="button button-primary"
              type="submit"
              disabled={uploading}
            >
              {uploading ? "Uploading to 0G…" : "Store on 0G"} <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DatasetsView({
  datasets,
  onDownload,
}: {
  datasets: Dataset[];
  onDownload: (dataset: Dataset) => void;
}) {
  const totalItems = datasets.reduce((total, dataset) => total + dataset.items, 0);
  const verifiedCount = datasets.filter((dataset) => dataset.status === "Verified").length;
  return (
    <div className="view animate-enter">
      <ViewHeader
        eyebrow="Verified knowledge"
        title="Datasets with provenance"
        description="Explore collections assembled from real bounty and storage-receipt records."
      />
      <div className="dataset-summary">
        <div>
          <span>Total indexed items</span>
            <strong>{numberFormat.format(totalItems)}</strong>
        </div>
        <div>
          <span>Verified collections</span>
            <strong>{numberFormat.format(verifiedCount)}</strong>
        </div>
        <div>
          <span>Storage receipts</span>
          <strong>{numberFormat.format(totalItems)}</strong>
        </div>
        <div className="dataset-summary-note">
          <ShieldCheck size={17} />
          <span>Manifests are ready for 0G Storage.</span>
        </div>
      </div>
      {datasets.length ? (
        <div className="dataset-grid">
          {datasets.map((dataset) => (
          <article className="dataset-card" key={dataset.id}>
            <div className="dataset-card-top">
              <span className="dataset-icon">
                <Database size={18} />
              </span>
              <span
                className={`dataset-status dataset-status-${dataset.status.toLowerCase()}`}
              >
                {dataset.status}
              </span>
            </div>
            <h2>{dataset.name}</h2>
            <p>
              {dataset.category} <span>·</span> {dataset.license} license
            </p>
            <div className="dataset-items">
              <strong>{numberFormat.format(dataset.items)}</strong>
              <span>items in {dataset.version}</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${dataset.progress}%` }} />
            </div>
            <div className="dataset-footer">
              <span>Updated {dataset.updated}</span>
              <button
                className="text-button"
                onClick={() => onDownload(dataset)}
              >
                <ArrowDownToLine size={15} /> Manifest
              </button>
            </div>
          </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No datasets yet"
          description="Create a bounty, then store a contribution on 0G to build a real dataset manifest."
        />
      )}
    </div>
  );
}

function ProfileView({
  wallet,
  onConnect,
  submissions,
}: {
  wallet: { address: string; chainId: string } | null;
  onConnect: () => void;
  submissions: Submission[];
}) {
  const walletSubmissions = wallet
    ? submissions.filter((submission) => submission.contributor?.toLowerCase() === wallet.address.toLowerCase())
    : [];
  const walletEarned = walletSubmissions.reduce((sum, submission) => sum + submission.reward, 0);
  const stored = walletSubmissions.filter(
    (submission) =>
      submission.status === "Stored" || submission.status === "Accepted",
  ).length;
  return (
    <div className="view animate-enter">
      <ViewHeader
        eyebrow="Contributor profile"
        title="Your verifiable contribution identity"
        description="This profile reflects only wallet state and real 0G Storage receipts."
        action={
          <button className="button button-secondary" onClick={onConnect}>
            <Wallet size={16} />{" "}
            {wallet ? "Wallet connected" : "Connect wallet"}
          </button>
        }
      />
      <div className="profile-grid">
        <section className="panel profile-card">
          <div className="profile-identity">
            <div className="profile-avatar">
              {wallet ? wallet.address.slice(2, 3).toUpperCase() : "—"}
            </div>
            <div>
              <h2>Your contributor profile</h2>
              <p>{wallet ? shortAddress(wallet.address) : "Wallet not connected"}</p>
              <span className="reputation-chip">
                <BadgeCheck size={14} />
                {wallet ? "0G Galileo wallet" : "Connect to establish identity"}
              </span>
            </div>
          </div>
          <div className="profile-stats">
            <div>
              <strong>{numberFormat.format(stored)}</strong>
              <span>Stored proofs</span>
            </div>
            <div>
              <strong>{numberFormat.format(walletSubmissions.length)}</strong>
              <span>Submissions</span>
            </div>
            <div>
              <strong>
                {Math.round((stored / Math.max(walletSubmissions.length, 1)) * 100)}
                %
              </strong>
              <span>Proof coverage</span>
            </div>
          </div>
          {wallet ? (
            <div className="wallet-detail">
              <span>Connected wallet</span>
              <strong>{shortAddress(wallet.address)}</strong>
              <small>Chain ID {wallet.chainId}</small>
            </div>
          ) : (
            <div className="wallet-empty">
              <Wallet size={17} />
              <span>Connect a wallet to sign uploads and establish provenance.</span>
              <button className="text-button" onClick={onConnect}>
                Connect <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
        <section className="panel specialties-card">
          <div className="panel-heading">
            <div>
              <h2>Proof toolkit</h2>
              <p>What each real contribution records.</p>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="specialty-list">
            <span>Merkle root</span>
            <span>Storage receipt</span>
            <span>Wallet signature</span>
            <span>Explorer link</span>
          </div>
          <div className="profile-tip">
            <Sparkles size={17} />
            <div>
              <strong>No synthetic reputation</strong>
              <p>Scores and badges stay empty until a real validator records them.</p>
            </div>
          </div>
        </section>
      </div>
      <section className="panel earnings-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Reward history</p>
            <h2>Your earnings</h2>
          </div>
          <strong className="earnings-total">
            {formatToken(walletEarned)}
          </strong>
        </div>
        {walletSubmissions.some((submission) => submission.reward > 0) ? (
          <div className="reward-history-list">
            {walletSubmissions
              .filter((submission) => submission.reward > 0)
              .map((submission) => (
                <div className="check-row" key={submission.id}>
                  <span>{submission.fileName}</span>
                  <strong>{formatToken(submission.reward)}</strong>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState
            title="No settlement receipts yet"
            description="Rewards appear only after a real validation and settlement transaction."
          />
        )}
      </section>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="empty-state">
      <span className="empty-icon">
        <FolderOpen size={22} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}
