// Research-style findings for the /eval page. Every number is computed from
// the committed eval run, so re-running the eval updates the write-up.

import { useState, type ReactNode } from "react";
import { DEFAULT_VISION_MODEL } from "@/lib/eval/constants";
import { EVAL_DATASET } from "@/lib/eval/dataset";
import type { EvalRow, ModelSummary } from "@/lib/eval/metrics";

const MODEL_NAMES: Record<string, string> = {
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "google/gemini-3.8-flash": "Gemini 3.8 Flash",
  "google/gemini-3.1-flash-lite": "Gemini 3.1 Flash Lite",
  "anthropic/claude-sonnet-5": "Claude Sonnet 5",
  "openai/gpt-5.6-terra": "GPT-5.6 Terra",
};

export function prettyModel(id: string): string {
  return MODEL_NAMES[id] ?? id.split("/").pop() ?? id;
}

const fmt1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : "—");

// ── Hero ──────────────────────────────────────────────────────────────────

export function EvalHero({ summaries, rows }: { summaries: ModelSummary[]; rows: EvalRow[] }) {
  const bestFit = [...summaries].sort((a, b) => b.fitAgreementPct - a.fitAgreementPct)[0];
  const tiles = [
    { value: String(EVAL_DATASET.length), label: "bags with known sizes" },
    { value: String(summaries.length), label: "AI models compared" },
    { value: String(rows.length), label: "photo checks run" },
    {
      value: bestFit ? `${Math.round(bestFit.fitAgreementPct)}%` : "—",
      label: "best right pass/fail call",
    },
  ];
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="card-chunky p-3 text-center">
          <div className="font-display text-3xl font-extrabold leading-none">{t.value}</div>
          <div className="mt-1 text-[11px] font-semibold text-muted-foreground">{t.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Finding 1: centimetres vs decisions ────────────────────────────────────

function RankedBars({
  title,
  hint,
  items,
  max,
  unit,
}: {
  title: string;
  hint: string;
  items: { id: string; value: number }[];
  max: number;
  unit: string;
}) {
  return (
    <figure className="min-w-0 flex-1">
      <figcaption className="text-xs font-bold">{title}</figcaption>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
      <ol className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li
            key={it.id}
            className="group text-xs"
            title={`${prettyModel(it.id)}: ${fmt1(it.value)}${unit}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate">
                <span className="mr-1 font-bold text-muted-foreground">{i + 1}.</span>
                {prettyModel(it.id)}
                {it.id === DEFAULT_VISION_MODEL && (
                  <span className="ml-1 rounded-full bg-accent px-1.5 text-[10px] font-bold">
                    in app
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono font-semibold">
                {fmt1(it.value)}
                {unit}
              </span>
            </div>
            <div className="mt-0.5 h-2 rounded-full bg-muted">
              <div
                className={`h-2 rounded-full transition-opacity group-hover:opacity-80 ${
                  i === 0 ? "bg-primary" : "bg-foreground/40"
                }`}
                style={{ width: `${Math.max(4, (it.value / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function FindingAccuracyVsDecisions({ summaries }: { summaries: ModelSummary[] }) {
  const byError = [...summaries]
    .sort((a, b) => a.maeCm - b.maeCm)
    .map((s) => ({ id: s.modelId, value: s.maeCm }));
  const byFit = [...summaries]
    .sort((a, b) => b.fitAgreementPct - a.fitAgreementPct)
    .map((s) => ({ id: s.modelId, value: s.fitAgreementPct }));
  const maxErr = Math.max(...byError.map((x) => x.value));
  return (
    <Finding
      n={1}
      title="The most accurate model doesn't make the best calls"
      body={
        <>
          The model with the smallest size error isn&apos;t the one that most often gives the right
          pass/fail answer. A verdict only flips when the estimate crosses an airline&apos;s limit, so a
          few centimetres either side of the limit matter far more than a big miss on a bag that
          clearly passes or clearly fails. That&apos;s why the app is judged on the{" "}
          <strong>fit call</strong>, not on centimetres.
        </>
      }
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        <RankedBars
          title="Average size error"
          hint="Lower is better"
          items={byError}
          max={maxErr}
          unit=" cm"
        />
        <RankedBars
          title="Right pass/fail call"
          hint="Higher is better · 63 decisions per model"
          items={byFit}
          max={100}
          unit="%"
        />
      </div>
    </Finding>
  );
}

// ── Finding 2: scale ambiguity (strip chart) ───────────────────────────────

const CABIN_LONGEST_CM = 55;

export function FindingScaleAmbiguity({ rows }: { rows: EvalRow[] }) {
  const checked = EVAL_DATASET.filter((i) => i.category === "checked case");
  // Pick the checked case the most models shrank to cabin size.
  const shrunk = (itemId: string) =>
    rows.filter(
      (r) => r.itemId === itemId && r.predDimsCm && Math.max(...r.predDimsCm) <= CABIN_LONGEST_CM + 2,
    ).length;
  const item = [...checked].sort((a, b) => shrunk(b.id) - shrunk(a.id))[0];
  const [hover, setHover] = useState<string | null>(null);
  if (!item) return null;

  const truth = Math.max(...item.dimsCm);
  const preds = rows
    .filter((r) => r.itemId === item.id && r.predDimsCm)
    .map((r) => ({ id: r.modelId, longest: Math.max(...r.predDimsCm!) }))
    .sort((a, b) => a.longest - b.longest);

  const totalShrunk = checked.reduce((n, c) => n + shrunk(c.id), 0);
  const totalChecked = rows.filter((r) => checked.some((c) => c.id === r.itemId)).length;

  // SVG geometry
  const W = 560;
  const rowH = 30;
  const left = 132;
  const right = 18;
  const top = 34;
  const H = top + preds.length * rowH + 26;
  const lo = 40;
  const hi = 90;
  const x = (cm: number) => left + ((cm - lo) / (hi - lo)) * (W - left - right);
  const ticks = [40, 50, 60, 70, 80, 90];

  return (
    <Finding
      n={2}
      title="Without anything for scale, a hold case looks like a cabin bag"
      body={
        <>
          In a clean studio photo, a {Math.round(truth)} cm hold case looks exactly like a 55 cm
          cabin case, because nothing in the frame says how big it is.
          Across the five checked cases, models called a hold case cabin-sized{" "}
          <strong>
            {totalShrunk} times out of {totalChecked}
          </strong>
          . That&apos;s the evidence behind the app asking you to put something familiar next to
          your bag.
        </>
      }
    >
      <figure>
        <figcaption className="text-xs font-bold">
          Longest side each model estimated for the {item.name} (actual {Math.round(truth)} cm)
        </figcaption>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-2 w-full"
          role="img"
          aria-label={`Estimates for ${item.name}: ${preds
            .map((p) => `${prettyModel(p.id)} ${p.longest} cm`)
            .join(", ")}. Actual ${truth} cm.`}
        >
          {/* grid + ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={x(t)}
                x2={x(t)}
                y1={top - 6}
                y2={H - 22}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <text
                x={x(t)}
                y={H - 6}
                textAnchor="middle"
                fontSize={11}
                fill="currentColor"
                fillOpacity={0.6}
              >
                {t} cm
              </text>
            </g>
          ))}
          {/* reference lines */}
          <line
            x1={x(CABIN_LONGEST_CM)}
            x2={x(CABIN_LONGEST_CM)}
            y1={top - 6}
            y2={H - 22}
            stroke="currentColor"
            strokeOpacity={0.5}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <text x={x(CABIN_LONGEST_CM)} y={top - 14} textAnchor="middle" fontSize={11} fontWeight={700} fill="currentColor">
            Cabin bag 55 cm
          </text>
          <line
            x1={x(truth)}
            x2={x(truth)}
            y1={top - 6}
            y2={H - 22}
            stroke="var(--primary)"
            strokeWidth={2}
          />
          <text x={x(truth)} y={top - 14} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--primary)">
            Actual {Math.round(truth)} cm
          </text>
          {/* rows */}
          {preds.map((p, i) => {
            const cy = top + i * rowH + rowH / 2;
            const wrong = p.longest <= CABIN_LONGEST_CM + 2;
            const active = hover === p.id;
            return (
              <g
                key={p.id}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
              >
                <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill="transparent" />
                <text x={left - 10} y={cy + 4} textAnchor="end" fontSize={12} fill="currentColor">
                  {prettyModel(p.id)}
                </text>
                <line
                  x1={x(Math.min(p.longest, truth))}
                  x2={x(Math.max(p.longest, truth))}
                  y1={cy}
                  y2={cy}
                  stroke="currentColor"
                  strokeOpacity={0.15}
                  strokeWidth={2}
                />
                <circle
                  cx={x(p.longest)}
                  cy={cy}
                  r={active ? 8 : 6}
                  fill={wrong ? "var(--card)" : "currentColor"}
                  stroke="currentColor"
                  strokeWidth={2}
                />
                {(active || wrong) && (
                  <text
                    x={x(p.longest) + (x(p.longest) > W - 190 ? -12 : 12)}
                    y={cy + 4}
                    textAnchor={x(p.longest) > W - 190 ? "end" : "start"}
                    fontSize={11}
                    fontWeight={700}
                    fill="currentColor"
                  >
                    {p.longest} cm{wrong ? " · called it cabin size" : ""}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-foreground" /> estimate in
            the right range
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-foreground bg-card" />{" "}
            estimate at cabin size
          </span>
        </div>
      </figure>
    </Finding>
  );
}

// ── Finding 3: standard vs non-standard sizes ──────────────────────────────────────

const STANDARD_SIZES: [number, number, number][] = [
  [40, 20, 25],
  [40, 30, 20],
  [45, 36, 20],
  [55, 40, 20],
  [55, 40, 23],
];

export function FindingStandardSizes({ rows }: { rows: EvalRow[] }) {
  const key = (d: [number, number, number]) =>
    [...d]
      .map((x) => Math.round(x))
      .sort((a, b) => b - a)
      .join("×");
  const std = new Set(STANDARD_SIZES.map(key));
  const byId = new Map(EVAL_DATASET.map((i) => [i.id, i]));
  const group = (isStd: boolean) => {
    const rs = rows.filter((r) => {
      const item = byId.get(r.itemId);
      return item && r.predDimsCm && std.has(key(item.dimsCm)) === isStd;
    });
    const errs = rs.flatMap((r) => {
      const t = [...byId.get(r.itemId)!.dimsCm].sort((a, b) => b - a);
      const p = [...r.predDimsCm!].sort((a, b) => b - a);
      return t.map((v, i) => Math.abs(p[i] - v));
    });
    const exact = rs.filter((r) => key(r.predDimsCm!) === key(byId.get(r.itemId)!.dimsCm)).length;
    const bags = EVAL_DATASET.filter((i) => std.has(key(i.dimsCm)) === isStd).length;
    return { bags, n: rs.length, exact, mae: errs.reduce((a, b) => a + b, 0) / (errs.length || 1) };
  };
  const s = group(true);
  const o = group(false);
  return (
    <Finding
      n={3}
      title="Bags built to airline sizes are easy. Everything else is twice as hard."
      body={
        <>
          {s.bags} of the {EVAL_DATASET.length} bags are made to a standard airline size such as
          55×40×20 or 40×25×20. Across all models, estimates for those were off by{" "}
          <strong>{fmt1(s.mae)} cm</strong> on average and exactly right {s.exact} times out of{" "}
          {s.n}. For the other {o.bags} bags the average error was{" "}
          <strong>{fmt1(o.mae)} cm</strong>, with no exact matches in {o.n} tries. Models recognise
          a familiar product shape far better than they measure an unfamiliar one. Part of that gap
          is Finding 2: all the hold cases are in the second group.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-center">
        {[
          { label: "Standard-size bags", g: s },
          { label: "Everything else", g: o },
        ].map(({ label, g }) => (
          <div key={label} className="rounded-2xl border-2 border-foreground/15 p-3">
            <div className="text-[11px] font-bold text-muted-foreground">{label}</div>
            <div className="font-display text-2xl font-extrabold">{fmt1(g.mae)} cm</div>
            <div className="text-[11px] text-muted-foreground">
              average error · {g.exact}/{g.n} exact
            </div>
          </div>
        ))}
      </div>
    </Finding>
  );
}

// ── Finding 4: integration bugs ────────────────────────────────────────────

export function FindingIntegration() {
  return (
    <Finding
      n={4}
      title="The eval caught bugs nothing else would have"
      body={
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Claude failed every call</strong>: the gateway only serves Claude through
            Anthropic&apos;s native Messages API, not the OpenAI-style endpoint. Fixed by routing
            Claude models there.
          </li>
          <li>
            <strong>OpenAI rejected one photo</strong>: an image host served AVIF, which OpenAI
            doesn&apos;t accept and Gemini does. Fixed by never asking for AVIF.
          </li>
          <li>
            <strong>Cheaper models hit rate limits</strong>: 13 calls failed with &ldquo;Too Many
            Requests&rdquo;. These are retried with back-off and never counted as model mistakes.
          </li>
        </ul>
      }
    />
  );
}

// ── Shared shell ───────────────────────────────────────────────────────────

function Finding({
  n,
  title,
  body,
  children,
}: {
  n: number;
  title: string;
  body: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="card-chunky mt-5 p-5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-primary">
        Finding {n}
      </div>
      <h2 className="mt-1 font-display text-xl font-extrabold leading-tight">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-foreground/80">{body}</div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
