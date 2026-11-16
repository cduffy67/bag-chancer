// Pure scoring for the vision eval. No network, no React — safe to unit test.

import { computeVerdict, type Traffic } from "../verdict";
import { EVAL_DATASET, EVAL_RULES, type EvalCategory, type EvalItem } from "./dataset";

export type EvalRow = {
  itemId: string;
  modelId: string;
  ok: boolean;
  schemaFailed?: boolean;
  fetchFailed?: boolean;
  error?: string;
  isBag?: boolean;
  predDimsCm?: [number, number, number];
  visualConfidence?: number;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
};

export type ModelSummary = {
  modelId: string;
  attempted: number;
  scored: number; // rows with usable dimension predictions
  fetchFailures: number;
  parseFailures: number;
  callFailures: number;
  missedBags: number; // model said "not a bag" for a real bag
  maeCm: number; // mean absolute error across all three sorted sides
  maeBySideCm: { longest: number; middle: number; shortest: number };
  biasCm: number; // mean signed error (+ = overestimates)
  mapePct: number; // mean absolute % error
  within3cmPct: number; // % of sides within ±3 cm
  fitAgreementPct: number; // pass/fail agrees with ground truth, across EVAL_RULES
  bandAgreementPct: number; // exact traffic-light band agrees
  medianLatencyMs: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  maeByCategoryCm: Partial<Record<EvalCategory, number>>;
  maeByScaleCueCm: { none: number; person: number };
  fitByScaleCuePct: { none: number; person: number };
};

const sortDesc = (d: [number, number, number]) =>
  [...d].sort((a, b) => b - a) as [number, number, number];

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const round1 = (x: number) => Math.round(x * 10) / 10;
const pct = (hits: number, n: number) => (n ? round1((hits / n) * 100) : NaN);

const PASSES: Traffic[] = ["grand", "borderline"];

export function verdictFor(dims: [number, number, number], airlineId: string, fareId: string) {
  const [w, h, d] = dims;
  return computeVerdict({ airlineId, fareId, manualDims: { w, h, d } }).traffic;
}

export function summariseModel(
  modelId: string,
  rows: EvalRow[],
  dataset: EvalItem[] = EVAL_DATASET,
): ModelSummary {
  const byId = new Map(dataset.map((i) => [i.id, i]));
  const mine = rows.filter((r) => r.modelId === modelId);

  const sideErrs: number[] = [];
  const signedErrs: number[] = [];
  const pctErrs: number[] = [];
  const longest: number[] = [];
  const middle: number[] = [];
  const shortest: number[] = [];
  const perCat: Partial<Record<EvalCategory, number[]>> = {};
  const perCue: Record<"none" | "person", number[]> = { none: [], person: [] };
  const fitCue: Record<"none" | "person", [number, number]> = { none: [0, 0], person: [0, 0] };
  let fitHits = 0;
  let bandHits = 0;
  let ruleChecks = 0;
  let scored = 0;

  for (const r of mine) {
    const item = byId.get(r.itemId);
    if (!item || !r.ok || !r.predDimsCm || r.isBag === false) continue;
    scored++;
    const truth = sortDesc(item.dimsCm);
    const pred = sortDesc(r.predDimsCm);
    const errs = truth.map((t, i) => pred[i] - t);
    errs.forEach((e, i) => {
      sideErrs.push(Math.abs(e));
      signedErrs.push(e);
      pctErrs.push((Math.abs(e) / truth[i]) * 100);
    });
    longest.push(Math.abs(errs[0]));
    middle.push(Math.abs(errs[1]));
    shortest.push(Math.abs(errs[2]));
    (perCat[item.category] ??= []).push(mean(errs.map(Math.abs)));
    perCue[item.scaleCue].push(mean(errs.map(Math.abs)));

    for (const rule of EVAL_RULES) {
      const tTruth = verdictFor(item.dimsCm, rule.airlineId, rule.fareId);
      const tPred = verdictFor(r.predDimsCm, rule.airlineId, rule.fareId);
      ruleChecks++;
      if (tTruth === tPred) bandHits++;
      const fit = PASSES.includes(tTruth) === PASSES.includes(tPred);
      if (fit) fitHits++;
      fitCue[item.scaleCue][1]++;
      if (fit) fitCue[item.scaleCue][0]++;
    }
  }

  const maeByCategoryCm: Partial<Record<EvalCategory, number>> = {};
  for (const [cat, xs] of Object.entries(perCat)) {
    maeByCategoryCm[cat as EvalCategory] = round1(mean(xs!));
  }

  return {
    modelId,
    attempted: mine.length,
    scored,
    fetchFailures: mine.filter((r) => r.fetchFailed).length,
    parseFailures: mine.filter((r) => r.schemaFailed).length,
    callFailures: mine.filter((r) => !r.ok && !r.schemaFailed && !r.fetchFailed).length,
    missedBags: mine.filter((r) => r.ok && r.isBag === false).length,
    maeCm: round1(mean(sideErrs)),
    maeBySideCm: {
      longest: round1(mean(longest)),
      middle: round1(mean(middle)),
      shortest: round1(mean(shortest)),
    },
    biasCm: round1(mean(signedErrs)),
    mapePct: round1(mean(pctErrs)),
    within3cmPct: pct(sideErrs.filter((e) => e <= 3).length, sideErrs.length),
    fitAgreementPct: pct(fitHits, ruleChecks),
    bandAgreementPct: pct(bandHits, ruleChecks),
    medianLatencyMs: Math.round(median(mine.filter((r) => r.latencyMs).map((r) => r.latencyMs!))),
    avgInputTokens: Math.round(mean(mine.filter((r) => r.inputTokens).map((r) => r.inputTokens!))),
    avgOutputTokens: Math.round(
      mean(mine.filter((r) => r.outputTokens).map((r) => r.outputTokens!)),
    ),
    maeByCategoryCm,
    maeByScaleCueCm: { none: round1(mean(perCue.none)), person: round1(mean(perCue.person)) },
    fitByScaleCuePct: { none: pct(...fitCue.none), person: pct(...fitCue.person) },
  };
}

export function summariseAll(rows: EvalRow[]): ModelSummary[] {
  const models = [...new Set(rows.map((r) => r.modelId))];
  const key = (s: ModelSummary) => (Number.isFinite(s.maeCm) ? s.maeCm : Infinity);
  return models.map((m) => summariseModel(m, rows)).sort((a, b) => key(a) - key(b));
}
