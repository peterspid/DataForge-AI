import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { JsonRpcProvider, Wallet } from "ethers";
import artifact from "../../../contracts/artifacts/DataForgeMarket.json";
import { Contract } from "ethers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ROUTER_URL =
  process.env.ZERO_G_COMPUTE_URL ?? "https://router-api-testnet.integratenetwork.work/v1";
const MODEL = process.env.ZERO_G_COMPUTE_MODEL ?? "qwen2.5-omni";
const RPC_URL = process.env.ZERO_G_RPC_URL ?? "https://evmrpc-testnet.0g.ai";

type ValidationInput = {
  bountyId: string;
  contributor: string;
  rootHash: string;
  storageTxHash: string;
  fingerprint: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function hashReport(report: string) {
  return `0x${createHash("sha256").update(report).digest("hex")}`;
}

function clampScore(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export async function POST(request: Request) {
  const apiKey = process.env.ZERO_G_COMPUTE_API_KEY;
  const validatorKey = process.env.DATAFORGE_VALIDATOR_PRIVATE_KEY;
  const contractAddress = process.env.DATAFORGE_CONTRACT_ADDRESS;
  if (!apiKey || !validatorKey || !contractAddress) {
    return json({ error: "Validation service is not configured." }, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Send the contribution as multipart/form-data." }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "A file is required." }, 400);
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return json({ error: "File size must be between 1 byte and 25 MB." }, 400);
  }

  const input: ValidationInput = {
    bountyId: String(form.get("bountyId") ?? ""),
    contributor: String(form.get("contributor") ?? ""),
    rootHash: String(form.get("rootHash") ?? ""),
    storageTxHash: String(form.get("storageTxHash") ?? ""),
    fingerprint: String(form.get("fingerprint") ?? ""),
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
  };
  if (!/^\d+$/.test(input.bountyId) || !/^0x[0-9a-fA-F]{40}$/.test(input.contributor)) {
    return json({ error: "Invalid validation identity." }, 400);
  }
  for (const hash of [input.rootHash, input.storageTxHash, input.fingerprint]) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return json({ error: "Invalid proof hash." }, 400);
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const preview = fileBytes.slice(0, 96 * 1024);
  const textPreview = new TextDecoder("utf-8", { fatal: false }).decode(preview);
  const isTextLike =
    input.fileType.startsWith("text/") ||
    input.fileName.toLowerCase().endsWith(".json") ||
    input.fileName.toLowerCase().endsWith(".csv");
  let score = 0;
  let decision = "review";
  let explanation = "This file requires requester review.";
  let modelId = "technical-checks";

  const technicalChecks: string[] = [];
  if (input.fileName.length <= 160) technicalChecks.push("Filename length is within policy.");
  if (input.fileSize <= MAX_UPLOAD_BYTES) technicalChecks.push("File size is within policy.");
  const has = (...signature: number[]) => signature.every((value, index) => fileBytes[index] === value);
  const executable =
    has(0x4d, 0x5a) ||
    has(0x7f, 0x45, 0x4c, 0x46) ||
    has(0xfe, 0xed, 0xfa, 0xce) ||
    has(0xcf, 0xfa, 0xed, 0xfe);
  if (executable) return json({ error: "Executable binaries are not accepted as dataset contributions." }, 422);
  const declared = input.fileType.toLowerCase();
  if (declared === "image/png" && !has(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return json({ error: "The PNG signature does not match the declared MIME type." }, 422);
  }
  if ((declared === "image/jpeg" || declared === "image/jpg") && !has(0xff, 0xd8, 0xff)) {
    return json({ error: "The JPEG signature does not match the declared MIME type." }, 422);
  }
  if (declared === "image/gif" && !(has(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) || has(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))) {
    return json({ error: "The GIF signature does not match the declared MIME type." }, 422);
  }
  technicalChecks.push("File signature and executable-binary checks passed.");
  if (isTextLike && textPreview.trim()) {
    try {
      if (input.fileName.toLowerCase().endsWith(".json")) {
        JSON.parse(new TextDecoder("utf-8").decode(await file.arrayBuffer()));
        technicalChecks.push("JSON parses successfully.");
      } else {
        const rows = textPreview.split(/\r?\n/).filter(Boolean);
        if (rows.length > 0) technicalChecks.push(`Text preview contains ${rows.length} non-empty lines.`);
      }
    } catch {
      return json({ error: "The structured file is not valid JSON." }, 422);
    }
  }

  if (isTextLike && textPreview.trim()) {
    const response = await fetch(`${ROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are DataForge's quality validator. Return JSON only with score (0-100), decision (accept or review), and explanation (max 240 chars). Score text/structured data for clarity, completeness, relevance, and obvious spam. Never claim to inspect bytes not shown.",
          },
          {
            role: "user",
            content: JSON.stringify({
              fileName: input.fileName,
              fileType: input.fileType,
              fileSize: input.fileSize,
              preview: textPreview.slice(0, 12000),
              technicalChecks,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string } }>;
      };
      modelId = payload.model ?? MODEL;
      const content = payload.choices?.[0]?.message?.content ?? "";
      try {
        const parsed = JSON.parse(content) as { score?: number; decision?: string; explanation?: string };
        score = clampScore(parsed.score);
        decision = parsed.decision === "accept" ? "accept" : "review";
        explanation = String(parsed.explanation ?? explanation).slice(0, 240);
      } catch {
        decision = "review";
        explanation = "The validator returned an unreadable report; requester review is required.";
      }
    } else {
      explanation = "The 0G validator was unavailable; requester review is required.";
    }
  } else {
    score = 60;
    explanation = "Binary media passed size and filename checks; semantic review is required because the available testnet model is text-only.";
  }

  const report = JSON.stringify({
    version: 1,
    model: modelId,
    decision,
    score,
    explanation,
    technicalChecks,
    file: {
      name: input.fileName,
      type: input.fileType,
      size: input.fileSize,
      rootHash: input.rootHash,
      storageTxHash: input.storageTxHash,
      fingerprint: input.fingerprint,
    },
    createdAt: new Date().toISOString(),
  });
  const reportHash = hashReport(report);
  const issuedAt = Math.floor(Date.now() / 1000);
  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(contractAddress, artifact.abi, provider);
  const digest = await contract.validationDigest(
    BigInt(input.bountyId),
    input.contributor,
    input.rootHash,
    input.storageTxHash,
    input.fingerprint,
    score,
    reportHash,
    issuedAt,
  );
  const validator = new Wallet(validatorKey);
  const signature = await validator.signMessage(Buffer.from(String(digest).slice(2), "hex"));
  return json({ score, decision, explanation, report, reportHash, issuedAt, signature, model: modelId });
}
