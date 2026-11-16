import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runBagVision } from "../vision.server";
import { EVAL_DATASET } from "./dataset";
import type { EvalRow } from "./metrics";

// Running the eval spends AI credits, so it's gated behind a token. Only the
// SHA-256 hash lives in the repo; the token itself is kept by the owner.
const EVAL_TOKEN_SHA256 = "1b8cd389a6ee6453572ea01f097279f34bea72a8e08614e8fae7c1d115a4633e";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function assertToken(token: string) {
  if ((await sha256Hex(token)) !== EVAL_TOKEN_SHA256) throw new Error("Invalid eval token");
}

function apiKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      // No AVIF: some providers (OpenAI) reject it.
      Accept: "image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.5",
    },
  });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const type = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0];
  if (!type.startsWith("image/")) throw new Error(`not an image (${type})`);
  if (type === "image/avif") throw new Error("host served AVIF, which not all providers accept");
  const bytes = new Uint8Array(await res.arrayBuffer());
  return `data:${type};base64,${bytesToBase64(bytes)}`;
}

function isRateLimited(run: { ok: boolean; error?: string }) {
  return !run.ok && /too many requests|\b429\b|rate limit/i.test(run.error ?? "");
}

export const listEvalModels = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string() }).parse(input))
  .handler(async ({ data }) => {
    await assertToken(data.token);
    const key = apiKey();
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/models", {
        headers: { "Lovable-API-Key": key, Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return { ok: false as const, error: `models endpoint ${res.status}`, models: [] };
      const json = (await res.json()) as { data?: Array<{ id: string }> };
      const models = (json.data ?? []).map((m) => m.id).sort();
      return { ok: true as const, models };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "models lookup failed",
        models: [],
      };
    }
  });

export const evalOne = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string(), itemId: z.string(), modelId: z.string().min(3) }).parse(input),
  )
  .handler(async ({ data }): Promise<EvalRow> => {
    await assertToken(data.token);
    const item = EVAL_DATASET.find((i) => i.id === data.itemId);
    if (!item) throw new Error(`Unknown item ${data.itemId}`);
    const base = { itemId: item.id, modelId: data.modelId };

    let image: string;
    try {
      image = await fetchImageAsDataUrl(item.imageUrl);
    } catch (err) {
      return {
        ...base,
        ok: false,
        fetchFailed: true,
        error: err instanceof Error ? err.message : "image fetch failed",
      };
    }

    // Gateway rate limits are an infrastructure problem, not a model failure:
    // back off and retry rather than scoring them against the model.
    let run = await runBagVision({ apiKey: apiKey(), modelId: data.modelId, bagImage: image });
    for (let attempt = 0; attempt < 4 && isRateLimited(run); attempt++) {
      await new Promise((r) => setTimeout(r, 4000 * 2 ** attempt));
      run = await runBagVision({ apiKey: apiKey(), modelId: data.modelId, bagImage: image });
    }
    const usage = {
      latencyMs: run.latencyMs,
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
    };
    if (!run.ok) {
      return { ...base, ...usage, ok: false, schemaFailed: run.schemaFailed, error: run.error };
    }
    const r = run.result;
    return {
      ...base,
      ...usage,
      ok: true,
      isBag: r.isBag,
      visualConfidence: r.visualConfidence,
      predDimsCm: [r.estimatedWidthCm, r.estimatedHeightCm, r.estimatedDepthCm],
    };
  });
