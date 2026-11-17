import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, FlaskConical, Loader2, Play } from "lucide-react";
import { AppHeader, DisclaimerFooter } from "@/components/AppShell";
import { EVAL_DATASET, EVAL_RULES } from "@/lib/eval/dataset";
import { summariseAll, type EvalRow, type ModelSummary } from "@/lib/eval/metrics";
import { EVAL_RESULTS } from "@/lib/eval/results";
import { evalOne, listEvalModels } from "@/lib/eval/runEval.functions";
import { DEFAULT_VISION_MODEL } from "@/lib/eval/constants";
import {
  EvalHero,
  FindingAccuracyVsDecisions,
  FindingIntegration,
  FindingScaleAmbiguity,
  FindingStandardSizes,
} from "@/components/EvalFindings";

export const Route = createFileRoute("/eval")({
  component: EvalPage,
  head: () => ({
    meta: [
      { title: "Can AI tell if your bag will fit? — Bag Chancer" },
      {
        name: "description",
        content:
          "Bag Chancer's vision eval: model size estimates vs manufacturer-published bag dimensions.",
      },
    ],
  }),
});

const PROMPT_VERSION = "v1-freeform-json";
const CONCURRENCY = 2;

function EvalPage() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("key"));
  }, []);

  const committed = EVAL_RESULTS;
  const committedSummary = useMemo(
    () => (committed ? summariseAll(committed.rows) : []),
    [committed],
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 pt-4">
        <Link
          to="/about"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="text-xs font-bold uppercase tracking-wide text-primary">
          <FlaskConical className="mr-1 inline h-4 w-4 align-[-3px]" />
          Research · 5 models · {EVAL_DATASET.length} bags
        </div>
        <h1 className="mt-1 font-display text-4xl font-extrabold leading-[1.05]">
          Can AI tell if your bag will fit?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Bag Chancer asks a vision model to estimate your bag&apos;s size from one photo, then
          plain code applies the airline&apos;s rules. To find out how far you can trust that, I
          took product photos of {EVAL_DATASET.length} real bags with manufacturer-published
          dimensions, from 40 cm under-seat backpacks to an 87 cm hold case. I ran each one through
          the exact prompt the app uses on five models from Google, Anthropic and OpenAI, and
          scored every estimate against the real size.
        </p>

        {committed ? (
          <>
            <EvalHero summaries={committedSummary} rows={committed.rows} />
            <FindingAccuracyVsDecisions summaries={committedSummary} />
            <FindingScaleAmbiguity rows={committed.rows} />
            <FindingStandardSizes rows={committed.rows} />
            <FindingIntegration />

            <section className="mt-10">
              <h2 className="font-display text-2xl font-extrabold">Full results</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Run {new Date(committed.runAt).toLocaleDateString("en-GB")} · prompt{" "}
                {committed.promptVersion} · scroll the tables sideways on mobile
              </p>
              <SummaryTable summaries={committedSummary} />
              <BreakdownTable summaries={committedSummary} />
              <ItemGrid rows={committed.rows} />
            </section>
          </>
        ) : (
          <p className="card-chunky mt-6 p-5 text-sm">No eval results committed yet.</p>
        )}

        <Methodology />

        {token && <RunPanel token={token} />}

        <DisclaimerFooter />
      </main>
    </div>
  );
}

function SummaryTable({ summaries }: { summaries: ModelSummary[] }) {
  return (
    <div className="card-chunky mt-3 overflow-x-auto p-0">
      <table className="w-full text-left text-xs">
        <thead className="border-b-2 border-foreground bg-accent/40">
          <tr>
            {[
              "Model",
              "Avg error",
              "Within ±3cm",
              "Bias",
              "Fit call right",
              "Exact band",
              "Failures",
              "Latency",
              "Tokens in/out",
            ].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.modelId} className="border-b border-foreground/10 last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold">{s.modelId}</td>
              <td className="px-3 py-2">
                {fmt(s.maeCm)} cm <span className="text-muted-foreground">({fmt(s.mapePct)}%)</span>
              </td>
              <td className="px-3 py-2">{fmt(s.within3cmPct)}%</td>
              <td className="px-3 py-2">
                {s.biasCm > 0 ? "+" : ""}
                {fmt(s.biasCm)} cm
              </td>
              <td className="px-3 py-2 font-bold">{fmt(s.fitAgreementPct)}%</td>
              <td className="px-3 py-2">{fmt(s.bandAgreementPct)}%</td>
              <td className="px-3 py-2">
                {s.parseFailures + s.callFailures + s.missedBags}/{s.attempted - s.fetchFailures}
              </td>
              <td className="px-3 py-2">{fmt(s.medianLatencyMs / 1000)}s</td>
              <td className="whitespace-nowrap px-3 py-2">
                {fmtInt(s.avgInputTokens)} / {fmtInt(s.avgOutputTokens)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const BREAKDOWN_COLS = [
  { label: "Under-seat", cats: ["underseat backpack", "underseat case", "holdall"] },
  { label: "Duffel / tote", cats: ["duffel", "tote"] },
  { label: "Cabin case", cats: ["cabin case"] },
  { label: "Checked case", cats: ["checked case"] },
] as const;

function BreakdownTable({ summaries }: { summaries: ModelSummary[] }) {
  const catMae = (s: ModelSummary, cats: readonly string[]) => {
    const xs = cats
      .map((c) => s.maeByCategoryCm[c as keyof typeof s.maeByCategoryCm])
      .filter((x): x is number => typeof x === "number" && Number.isFinite(x));
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
  };
  return (
    <div className="card-chunky mt-3 overflow-x-auto p-0">
      <table className="w-full text-left text-xs">
        <thead className="border-b-2 border-foreground bg-muted/60">
          <tr>
            <th className="px-3 py-2 font-bold">Avg error by bag type</th>
            {BREAKDOWN_COLS.map((c) => (
              <th key={c.label} className="whitespace-nowrap px-3 py-2 font-bold">
                {c.label}
              </th>
            ))}
            <th className="whitespace-nowrap px-3 py-2 font-bold">No scale cue</th>
            <th className="whitespace-nowrap px-3 py-2 font-bold">Person in shot</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.modelId} className="border-b border-foreground/10 last:border-0">
              <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold">{s.modelId}</td>
              {BREAKDOWN_COLS.map((c) => (
                <td key={c.label} className="px-3 py-2">
                  {fmt(catMae(s, c.cats))} cm
                </td>
              ))}
              <td className="px-3 py-2">{fmt(s.maeByScaleCueCm.none)} cm</td>
              <td className="px-3 py-2">{fmt(s.maeByScaleCueCm.person)} cm</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemGrid({ rows }: { rows: EvalRow[] }) {
  const models = [...new Set(rows.map((r) => r.modelId))];
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-semibold">Per-bag results</summary>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {EVAL_DATASET.map((item) => (
          <li key={item.id} className="card-chunky flex gap-3 p-3 text-xs">
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-20 w-20 shrink-0 rounded-xl border bg-white object-contain"
            />
            <div className="min-w-0">
              <div className="truncate font-bold">{item.name}</div>
              <div className="text-muted-foreground">
                {item.category} · truth {dimsStr(item.dimsCm)}
              </div>
              {models.map((m) => {
                const r = rows.find((x) => x.itemId === item.id && x.modelId === m);
                return (
                  <div key={m} className="mt-0.5 truncate">
                    <span className="font-mono text-muted-foreground">{shortModel(m)}</span>{" "}
                    {!r
                      ? "—"
                      : r.predDimsCm && r.isBag !== false
                        ? dimsStr(r.predDimsCm)
                        : r.fetchFailed
                          ? "image unavailable"
                          : r.isBag === false
                            ? "said not a bag"
                            : "failed"}
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Methodology() {
  return (
    <section className="card-chunky mt-6 space-y-2 p-5 text-sm">
      <h2 className="font-display text-lg font-bold">Method</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Avg error</strong>: mean absolute error across all three sides, compared
          orientation-free (both sets of sides sorted longest → shortest).
        </li>
        <li>
          <strong>Fit call right</strong>: would the app give the same pass/fail answer using the
          estimate as using the real dimensions? Scored against{" "}
          {EVAL_RULES.map((r) => r.label).join(", ")}. This is the number that matters to a user.
        </li>
        <li>
          <strong>Exact band</strong>: same traffic-light colour (grand / borderline / chancing /
          no chance).
        </li>
        <li>
          <strong>Failures</strong>: unparseable responses, call errors, or calling a real bag
          &ldquo;not a bag&rdquo;. Rate-limited calls are retried, not counted.
        </li>
      </ul>
      <h2 className="pt-2 font-display text-lg font-bold">Limitations</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          {EVAL_DATASET.length} bags is a small set: a few points of difference in the fit call is
          about two decisions, which is within noise.
        </li>
        <li>
          These are retail product photos, not phone photos taken in a hallway, and only two have
          anything in frame for scale.
        </li>
        <li>
          Next: real phone photos of measured bags, with a reference object, to test the app the
          way people actually use it.
        </li>
      </ul>
    </section>
  );
}

function RunPanel({ token }: { token: string }) {
  const listFn = useServerFn(listEvalModels);
  const evalFn = useServerFn(evalOne);
  const [available, setAvailable] = useState<string[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([DEFAULT_VISION_MODEL]);
  const [custom, setCustom] = useState("");
  const [rows, setRows] = useState<EvalRow[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    listFn({ data: { token } })
      .then((r) => (r.ok ? setAvailable(r.models) : setListError(r.error)))
      .catch((e) => setListError(e instanceof Error ? e.message : String(e)));
  }, [listFn, token]);

  const [total, setTotal] = useState(0);
  const summaries = useMemo(() => summariseAll(rows), [rows]);
  const exportJson = useMemo(
    () =>
      JSON.stringify(
        { runAt: new Date().toISOString(), promptVersion: PROMPT_VERSION, rows },
        null,
        1,
      ),
    [rows],
  );

  // Re-run only what failed in the committed results (excluding unfetchable
  // images), plus any selected model that isn't in the committed run yet.
  const retryJobs = () => {
    const base = EVAL_RESULTS?.rows ?? [];
    const have = new Set(base.map((r) => r.modelId));
    return [
      ...base.filter((r) => !r.ok && !r.fetchFailed).map(({ modelId, itemId }) => ({ modelId, itemId })),
      ...selected
        .filter((m) => !have.has(m))
        .flatMap((modelId) => EVAL_DATASET.map((item) => ({ modelId, itemId: item.id }))),
    ];
  };

  const run = async (mode: "fresh" | "retry") => {
    setRunning(true);
    setDone(0);
    const jobs =
      mode === "retry"
        ? retryJobs()
        : selected.flatMap((modelId) => EVAL_DATASET.map((item) => ({ modelId, itemId: item.id })));
    if (mode === "retry") {
      const redo = new Set(jobs.map((j) => `${j.modelId}|${j.itemId}`));
      setRows((EVAL_RESULTS?.rows ?? []).filter((r) => !redo.has(`${r.modelId}|${r.itemId}`)));
    } else {
      setRows([]);
    }
    setTotal(jobs.length);
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        let row: EvalRow;
        try {
          row = await evalFn({ data: { token, ...job } });
        } catch (e) {
          row = { ...job, ok: false, error: e instanceof Error ? e.message : String(e) };
        }
        setRows((prev) => [
          ...prev.filter((r) => !(r.modelId === row.modelId && r.itemId === row.itemId)),
          row,
        ]);
        setDone((d) => d + 1);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
  };

  const toggle = (m: string) =>
    setSelected((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));

  return (
    <section className="card-chunky-lg mt-8 space-y-4 p-5" data-eval-panel>
      <h2 className="font-display text-xl font-bold">Run eval</h2>
      <div>
        <div className="text-xs font-bold uppercase text-muted-foreground">Models</div>
        {listError && <p className="text-xs text-destructive">Model list: {listError}</p>}
        <div className="mt-2 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
          {[...new Set([DEFAULT_VISION_MODEL, ...available, ...selected])].map((m) => (
            <button
              key={m}
              onClick={() => toggle(m)}
              data-model={m}
              className={`rounded-full border-2 px-2.5 py-1 font-mono text-[11px] ${
                selected.includes(m) ? "border-foreground bg-accent" : "border-foreground/20"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) setSelected((s) => [...new Set([...s, custom.trim()])]);
            setCustom("");
          }}
        >
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="add model id…"
            className="flex-1 rounded-xl border-2 border-foreground/30 px-3 py-1.5 font-mono text-xs"
          />
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => run("fresh")}
          disabled={running || selected.length === 0}
          data-run-eval
          className="btn-chunky flex items-center gap-2 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running
            ? `Running ${done}/${total}…`
            : `Fresh run (${selected.length * EVAL_DATASET.length} checks)`}
        </button>
        {EVAL_RESULTS && (
          <button
            onClick={() => run("retry")}
            disabled={running}
            data-retry-eval
            className="btn-chunky flex items-center gap-2 bg-card px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            Retry failures + add new models ({retryJobs().length})
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <SummaryTable summaries={summaries} />
          <BreakdownTable summaries={summaries} />
          <ItemGrid rows={rows} />
          <details>
            <summary className="cursor-pointer text-sm font-semibold">Export JSON</summary>
            <pre
              data-eval-export
              className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted p-3 text-[10px]"
            >
              {exportJson}
            </pre>
          </details>
        </>
      )}
    </section>
  );
}

const fmt = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : "—");
const fmtInt = (x: number) => (Number.isFinite(x) ? x.toLocaleString() : "—");
const dimsStr = (d: [number, number, number]) =>
  [...d]
    .sort((a, b) => b - a)
    .map((x) => Math.round(x))
    .join("×") + " cm";
const shortModel = (m: string) => m.split("/").pop();
