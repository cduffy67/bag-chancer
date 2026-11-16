import { getAirline, type Airline, type FareTier } from "./airlines";

export type Dims = { w: number; h: number; d: number };
export type BagType = "soft" | "hard" | "backpack" | "tote";
export type Traffic = "grand" | "borderline" | "chancing" | "nochance";

export const TRAFFIC_LABELS: Record<Traffic, string> = {
  grand: "Grand",
  borderline: "Borderline",
  chancing: "Chancing it",
  nochance: "No chance",
};

// Visual colour band per level.
export const TRAFFIC_TONES: Record<Traffic, "green" | "amber" | "orange" | "red"> = {
  grand: "green",
  borderline: "amber",
  chancing: "orange",
  nochance: "red",
};


export type VerdictInput = {
  airlineId: string;
  fareId: string;
  estimatedDims?: Dims;
  manualDims?: Dims;
  bagType?: BagType;
  bulging?: boolean;
  hasReferenceObject?: boolean;
  hasBoardingPass?: boolean;
  name?: string;
};

export type Verdict = {
  traffic: Traffic;
  headline: string;
  officialStatus: string;
  chancerStatus: string;
  confidence: number;
  recommendation: string[];
  effectiveDims: Dims;
  ruleUsed: { tier: "small" | "cabin"; limit: Dims; weight?: number } | null;
};

// Headlines — short, warm, not novelty. {name} is optional and used sparingly.
const HEADLINES: Record<Traffic, string[]> = {
  grand: ["{name}, you're grand.", "You're grand.", "All good here."],
  
  borderline: [
    "This one's a bit borderline.",
    "Borderline — but possible.",
    "{name}, it's borderline.",
  ],
  chancing: [
    "You might be chancing it.",
    "{name}, you might be chancing it.",
    "This feels like a priority upgrade situation.",
  ],
  nochance: [
    "I'd be careful with this bag.",
    "Probably worth measuring this one.",
    "{name}, this looks like a hold-bag situation.",
  ],
};

const CHANCER_LINES: Record<Traffic, string[]> = {
  grand: [
    "Well within the limit. Walk on.",
    "Plenty of room to spare.",
  ],
  borderline: [
    "Right on the edge. A confident walk past the sizer helps.",
    "If you can squish it a bit, you're fine.",
  ],
  chancing: [
    "A bit over on one side. Priority would settle the nerves.",
    "Possible if you pack it carefully and board early.",
  ],
  nochance: [
    "Properly oversize. Best to plan for the hold.",
    "Likely to get pulled at the gate.",
  ],
};

const RECS: Record<Traffic, string[]> = {
  grand: [
    "Measure once before leaving, just to be sure.",
    "Don't overpack on the way home.",
  ],
  borderline: [
    "Try a soft-sided bag if you have one.",
    "Pack heavier items low and tight.",
    "Wear a jacket with big pockets.",
  ],
  chancing: [
    "Consider adding priority — it's cheaper than a gate bag fee.",
    "Board early so the overhead is still free.",
    "Be ready to move items into your pockets at the gate.",
  ],
  nochance: [
    "Add a hold bag online — much cheaper than at the gate.",
    "Or swap to a smaller bag and post the rest.",
    "Avoid the sizer if at all possible.",
  ],
};

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function withName(text: string, name?: string): string {
  if (!text.includes("{name}")) return text;
  if (!name) {
    // Fall back to a name-free phrasing rather than printing "{name}".
    return text.replace(/^\{name\},\s*/i, "").replace(/,\s*\{name\}/g, "").replace(/\{name\}/g, "you");
  }
  return text.replace(/\{name\}/g, name);
}

function hashSeed(input: VerdictInput): number {
  const s = `${input.airlineId}|${input.fareId}|${input.bagType ?? ""}|${input.bulging}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function fitMargin(d: Dims, limit: Dims): number {
  const [bw, bh, bd] = [d.w, d.h, d.d].sort((a, b) => b - a);
  const [lw, lh, ld] = [limit.w, limit.h, limit.d].sort((a, b) => b - a);
  return Math.max((bw - lw) / lw, (bh - lh) / lh, (bd - ld) / ld) * 100;
}

function computeConfidence(input: VerdictInput): number {
  let c = 30;
  if (input.estimatedDims) c += 20;
  if (input.manualDims) c += 25;
  if (input.hasReferenceObject) c += 15;
  if (input.hasBoardingPass) c += 10;
  return Math.min(100, c);
}

export function computeVerdict(input: VerdictInput): Verdict {
  const airline = getAirline(input.airlineId) as Airline;
  const fare = airline.fares.find((f) => f.id === input.fareId) as FareTier;
  const dims = input.manualDims ?? input.estimatedDims ?? { w: 40, h: 25, d: 20 };

  const limit = fare.cabinBag ?? fare.smallBag!;
  const tier: "small" | "cabin" = fare.cabinBag ? "cabin" : "small";
  const margin = fitMargin(dims, { w: limit.w, h: limit.h, d: limit.d });

  let traffic: Traffic;
  if (margin <= -5) traffic = "grand";
  else if (margin <= 5) traffic = "borderline";
  else if (margin <= 12) traffic = "chancing";
  else traffic = "nochance";

  // A bulging soft bag bumps you one level worse (but never past nochance).
  if (input.bulging) {
    const order: Traffic[] = ["grand", "borderline", "chancing", "nochance"];
    const idx = order.indexOf(traffic);
    traffic = order[Math.min(order.length - 1, idx + 1)];
  }

  const seed = hashSeed(input);
  const headline = withName(pick(HEADLINES[traffic], seed), input.name);
  const chancerStatus = withName(pick(CHANCER_LINES[traffic], seed + 7), input.name);
  const recommendation = RECS[traffic].slice(0, traffic === "grand" ? 2 : 3);

  const overshootCm = Math.max(
    dims.w - limit.w,
    dims.h - limit.h,
    dims.d - limit.d,
  );

  const tierLabel = tier === "cabin" ? "cabin" : "small";
  const officialStatus =
    traffic === "grand"
      ? `Within ${airline.name}'s ${tierLabel} bag allowance (${limit.w}×${limit.h}×${limit.d} cm).`
      : traffic === "borderline"
        ? `Borderline for ${airline.name}. Estimated ${dims.w}×${dims.h}×${dims.d} cm vs limit ${limit.w}×${limit.h}×${limit.d} cm.`
        : `Over ${airline.name}'s ${tierLabel} bag allowance. Estimated ${dims.w}×${dims.h}×${dims.d} cm vs limit ${limit.w}×${limit.h}×${limit.d} cm — about ${Math.max(1, Math.round(overshootCm))} cm over on the worst side.`;

  return {
    traffic,
    headline,
    officialStatus,
    chancerStatus,
    confidence: computeConfidence(input),
    recommendation,
    effectiveDims: dims,
    ruleUsed: { tier, limit: { w: limit.w, h: limit.h, d: limit.d }, weight: limit.weight },
  };
}
