// Shared bag-vision step. Used by the app (analyzeBag) and by the eval
// harness (runEval), so the eval measures exactly what users get.

import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { DEFAULT_VISION_MODEL } from "./eval/constants";

export { DEFAULT_VISION_MODEL };

// Lenient schema — every field has a default so a slightly off AI response
// still parses. Strictness lives in the prompt, not in the validator.
const BagTypeEnum = z.enum([
  "backpack",
  "cabin suitcase",
  "tote",
  "holdall",
  "duffel",
  "handbag",
  "large suitcase",
  "other",
  "not applicable",
]);

export const VisionSchema = z
  .object({
    isBag: z.boolean().catch(false),
    detectedObject: z.string().max(120).catch("unknown"),
    bagType: BagTypeEnum.catch("other"),
    softOrHard: z.enum(["soft", "hard-shell", "unknown"]).catch("unknown"),
    overpacked: z.enum(["yes", "no", "unknown"]).catch("unknown"),
    referenceObjectDetected: z.boolean().catch(false),
    roughSizeCategory: z
      .enum([
        "small personal item",
        "cabin bag",
        "large cabin bag",
        "checked bag",
        "impossible to tell",
      ])
      .catch("impossible to tell"),
    visualConfidence: z.coerce.number().min(0).max(100).catch(40),
    notes: z.string().max(280).catch("Image analysed, but details were limited."),
    estimatedWidthCm: z.coerce.number().min(0).max(150).catch(40),
    estimatedHeightCm: z.coerce.number().min(0).max(150).catch(55),
    estimatedDepthCm: z.coerce.number().min(0).max(100).catch(20),
  })
  .partial()
  .transform((v) => ({
    isBag: v.isBag ?? false,
    detectedObject: v.detectedObject ?? "unknown",
    bagType: v.bagType ?? "other",
    softOrHard: v.softOrHard ?? "unknown",
    overpacked: v.overpacked ?? "unknown",
    referenceObjectDetected: v.referenceObjectDetected ?? false,
    roughSizeCategory: v.roughSizeCategory ?? "impossible to tell",
    visualConfidence: v.visualConfidence ?? 40,
    notes: v.notes ?? "Image analysed, but details were limited.",
    estimatedWidthCm: v.estimatedWidthCm ?? 40,
    estimatedHeightCm: v.estimatedHeightCm ?? 55,
    estimatedDepthCm: v.estimatedDepthCm ?? 20,
  }));

export type BagVisionResult = z.infer<typeof VisionSchema>;

// Pull the first {...} block out of a possibly noisy model response
// (markdown fences, leading prose, trailing commentary).
export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("no json object found in model response");
  }
  let slice = candidate.slice(start, end + 1);
  // Remove trailing commas before } or ]
  slice = slice.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(slice);
}

const SCHEMA_INSTRUCTION = `Return ONLY a single valid JSON object — no markdown, no code fences, no prose before or after. The JSON MUST match this exact schema and use exactly these allowed values:
{
  "isBag": boolean,
  "detectedObject": string,
  "bagType": "backpack" | "cabin suitcase" | "tote" | "holdall" | "duffel" | "handbag" | "large suitcase" | "other" | "not applicable",
  "softOrHard": "soft" | "hard-shell" | "unknown",
  "overpacked": "yes" | "no" | "unknown",
  "referenceObjectDetected": boolean,
  "roughSizeCategory": "small personal item" | "cabin bag" | "large cabin bag" | "checked bag" | "impossible to tell",
  "visualConfidence": number (0-100),
  "notes": string (max 25 words, plain English, no emojis),
  "estimatedWidthCm": number,
  "estimatedHeightCm": number,
  "estimatedDepthCm": number
}`;

export function buildVisionPrompt(referenceObject?: string): string {
  const refLine = referenceObject
    ? `A second image shows the bag next to a real-world reference object: ${referenceObject}. Use that object's typical real-world size to scale your dimension estimates and set referenceObjectDetected=true.`
    : `No reference object is provided — set referenceObjectDetected=false and give a best-guess estimate.`;
  return (
    `You are the vision step for a web app called Bag Chancer. ` +
    `Carefully look at the FIRST image. ` +
    `Decide if it actually shows a piece of luggage/bag a traveller would carry (backpack, suitcase, tote, holdall, duffel, handbag). ` +
    `If the image shows a person, face/headshot, food, a can, a pet, a screenshot, a random object or anything that is NOT luggage, set isBag=false and bagType="not applicable" and softOrHard="unknown". ` +
    `If it IS a bag, estimate outer dimensions in centimetres (W x H x D), pick the closest bagType, classify soft vs hard-shell, and judge if it looks overpacked/bulging (use "yes"/"no"/"unknown"). ` +
    refLine +
    ` ` +
    SCHEMA_INSTRUCTION
  );
}

// Surface the provider's response body (e.g. why a request was a 400), which the
// SDK's top-level message hides. Walks RetryError → lastError → APICallError.
function describeError(err: unknown): string {
  if (!(err instanceof Error)) return "AI vision call failed — try a clearer photo.";
  const e = err as Error & { lastError?: unknown; responseBody?: string; statusCode?: number };
  const inner = (e.lastError ?? e) as { responseBody?: string; statusCode?: number; message?: string };
  const body = inner.responseBody ? ` — ${String(inner.responseBody).slice(0, 400)}` : "";
  const status = inner.statusCode ? ` [${inner.statusCode}]` : "";
  return `${e.message}${status}${body}`;
}

export type VisionRun =
  | {
      ok: true;
      result: BagVisionResult;
      rawText: string;
      latencyMs: number;
      inputTokens?: number;
      outputTokens?: number;
    }
  | {
      ok: false;
      schemaFailed: boolean;
      error: string;
      rawText: string;
      latencyMs: number;
      inputTokens?: number;
      outputTokens?: number;
    };

const GATEWAY_BASE = "https://ai.gateway.lovable.dev/v1";

// Minimal native Anthropic Messages API call through the Lovable gateway.
async function callAnthropicMessages(
  apiKey: string,
  modelId: string,
  content: Array<{ type: "text"; text: string } | { type: "image"; image: string }>,
): Promise<{ text: string; inputTokens?: number; outputTokens?: number }> {
  const blocks = content.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text };
    const m = part.image.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) throw new Error("expected a base64 data URL image");
    return { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
  });
  const res = await fetch(`${GATEWAY_BASE}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      Authorization: `Bearer ${apiKey}`,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 1024,
      messages: [{ role: "user", content: blocks }],
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    throw Object.assign(new Error(res.statusText || "Messages API error"), {
      statusCode: res.status,
      responseBody: bodyText,
    });
  }
  const json = JSON.parse(bodyText) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  return {
    text: (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join(""),
    inputTokens: json.usage?.input_tokens,
    outputTokens: json.usage?.output_tokens,
  };
}

export async function runBagVision(opts: {
  apiKey: string;
  modelId?: string;
  bagImage: string; // data URL
  referenceImage?: string; // data URL
  referenceObject?: string;
}): Promise<VisionRun> {
  const gateway = createLovableAiGatewayProvider(opts.apiKey);
  const model = gateway(opts.modelId ?? DEFAULT_VISION_MODEL);

  const content: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
    { type: "text", text: buildVisionPrompt(opts.referenceObject) },
    { type: "image", image: opts.bagImage },
  ];
  if (opts.referenceImage) content.push({ type: "image", image: opts.referenceImage });

  const started = Date.now();
  let rawText = "";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  try {
    const modelId = opts.modelId ?? DEFAULT_VISION_MODEL;
    if (modelId.startsWith("anthropic/")) {
      // The gateway only serves Claude via the native Messages API.
      const res = await callAnthropicMessages(opts.apiKey, modelId, content);
      rawText = res.text;
      inputTokens = res.inputTokens;
      outputTokens = res.outputTokens;
    } else {
      const res = await generateText({ model, messages: [{ role: "user", content }] });
      rawText = res.text;
      inputTokens = res.usage?.inputTokens;
      outputTokens = res.usage?.outputTokens;
    }
  } catch (err) {
    return {
      ok: false,
      schemaFailed: false,
      error: describeError(err),
      rawText,
      latencyMs: Date.now() - started,
    };
  }
  const latencyMs = Date.now() - started;

  try {
    const result = VisionSchema.parse(extractJsonObject(rawText));
    return { ok: true, result, rawText, latencyMs, inputTokens, outputTokens };
  } catch {
    return {
      ok: false,
      schemaFailed: true,
      error: "Couldn't read that one properly",
      rawText,
      latencyMs,
      inputTokens,
      outputTokens,
    };
  }
}
