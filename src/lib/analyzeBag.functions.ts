import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  bagImageDataUrl: z.string().min(20),
  referenceImageDataUrl: z.string().optional(),
  referenceObject: z.string().optional(),
});

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

const VisionSchema = z
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
function extractJsonObject(raw: string): unknown {
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

export const analyzeBag = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        ok: false as const,
        schemaFailed: false as const,
        error:
          "AI vision is not configured. Add LOVABLE_API_KEY (Lovable AI Gateway) to enable real bag detection.",
      };
    }

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash");

    const refLine = data.referenceObject
      ? `A second image shows the bag next to a real-world reference object: ${data.referenceObject}. Use that object's typical real-world size to scale your dimension estimates and set referenceObjectDetected=true.`
      : `No reference object is provided — set referenceObjectDetected=false and give a best-guess estimate.`;

    const schemaInstruction = `Return ONLY a single valid JSON object — no markdown, no code fences, no prose before or after. The JSON MUST match this exact schema and use exactly these allowed values:
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

    const content: Array<
      { type: "text"; text: string } | { type: "image"; image: string }
    > = [
      {
        type: "text",
        text:
          `You are the vision step for a web app called Bag Chancer. ` +
          `Carefully look at the FIRST image. ` +
          `Decide if it actually shows a piece of luggage/bag a traveller would carry (backpack, suitcase, tote, holdall, duffel, handbag). ` +
          `If the image shows a person, face/headshot, food, a can, a pet, a screenshot, a random object or anything that is NOT luggage, set isBag=false and bagType="not applicable" and softOrHard="unknown". ` +
          `If it IS a bag, estimate outer dimensions in centimetres (W x H x D), pick the closest bagType, classify soft vs hard-shell, and judge if it looks overpacked/bulging (use "yes"/"no"/"unknown"). ` +
          refLine +
          ` ` +
          schemaInstruction,
      },
      { type: "image", image: data.bagImageDataUrl },
    ];
    if (data.referenceImageDataUrl) {
      content.push({ type: "image", image: data.referenceImageDataUrl });
    }

    let rawText = "";
    try {
      const { text } = await generateText({
        model,
        messages: [{ role: "user", content }],
      });
      rawText = text;
      console.log("[analyzeBag] raw AI response:", rawText);
    } catch (err) {
      console.error("[analyzeBag] model call failed:", err);
      return {
        ok: false as const,
        schemaFailed: false as const,
        error:
          err instanceof Error
            ? err.message
            : "AI vision call failed — try a clearer photo.",
      };
    }

    try {
      const parsedJson = extractJsonObject(rawText);
      const result = VisionSchema.parse(parsedJson);
      console.log("[analyzeBag] parsed structured object:", result);
      return { ok: true as const, schemaFailed: false as const, result };
    } catch (err) {
      console.error("[analyzeBag] schema validation failed:", err, "raw:", rawText);
      return {
        ok: false as const,
        schemaFailed: true as const,
        error: "Couldn't read that one properly",
      };
    }
  });
