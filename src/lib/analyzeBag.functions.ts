import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runBagVision, type BagVisionResult } from "./vision.server";

export type { BagVisionResult };

const InputSchema = z.object({
  bagImageDataUrl: z.string().min(20),
  referenceImageDataUrl: z.string().optional(),
  referenceObject: z.string().optional(),
});

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

    const run = await runBagVision({
      apiKey: key,
      bagImage: data.bagImageDataUrl,
      referenceImage: data.referenceImageDataUrl,
      referenceObject: data.referenceObject,
    });
    console.log("[analyzeBag] raw AI response:", run.rawText);

    if (run.ok) {
      return { ok: true as const, schemaFailed: false as const, result: run.result };
    }
    console.error("[analyzeBag] failed:", run.error);
    return run.schemaFailed
      ? { ok: false as const, schemaFailed: true as const, error: run.error }
      : { ok: false as const, schemaFailed: false as const, error: run.error };
  });
