import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, FlaskConical, Sparkles, Ticket } from "lucide-react";
import { AppHeader, DisclaimerFooter } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { ProfileAvatar, NotBagBadge } from "@/components/Avatar";
import { TripCounter } from "@/components/TripCounter";
import { VerdictBadge } from "@/components/VerdictBadge";
import { loadHistory, type HistoryEntry } from "@/lib/history";
import { type Traffic } from "@/lib/verdict";
import { EVAL_DATASET } from "@/lib/eval/dataset";
import { summariseAll } from "@/lib/eval/metrics";
import { EVAL_RESULTS } from "@/lib/eval/results";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Bag Chancer — Will your bag get on the plane?" },
      {
        name: "description",
        content:
          "Snap your bag, pick your airline, and find out if you're getting away with it at the gate on Ireland↔UK flights.",
      },
    ],
  }),
});

function Home() {
  const [recent, setRecent] = useState<HistoryEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    const read = () => {
      loadHistory().then((h) => {
        if (!cancelled) setRecent(h.slice(0, 3));
      });
    };
    read();
    window.addEventListener("bag-chancer:history", read);
    return () => {
      cancelled = true;
      window.removeEventListener("bag-chancer:history", read);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 pt-8">
        <section className="card-chunky-lg relative overflow-hidden p-6 text-center">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/70" />
          <div className="absolute -left-8 bottom-4 h-16 w-16 rounded-full bg-secondary/50" />
          <div className="relative">
            <div className="mb-3 flex items-center justify-center gap-3">
              <Mascot mood="happy" size="lg" />
              <ProfileAvatar size={48} />
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05]">
              <span className="text-primary">Will your bag survive the gate?</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm text-muted-foreground">
              The Ireland ↔ UK carry-on chancer. Snap a photo, pick your airline,
              get the verdict.
            </p>
            <Link
              to="/check"
              className="btn-chunky mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3 text-base font-bold text-primary-foreground"
            >
              Check a bag <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-4 gap-2 text-center text-[10px] font-semibold">
          {(
            [
              { tone: "green", emoji: "🟢", label: "Grand" },
              { tone: "amber", emoji: "🟡", label: "Borderline" },
              { tone: "orange", emoji: "🟠", label: "Chancing it" },
              { tone: "red", emoji: "🔴", label: "No chance" },
            ] as const
          ).map((t) => (
            <div key={t.label} className="card-chunky p-2">
              <div className="text-xl">{t.emoji}</div>
              <div className="mt-1 leading-tight">{t.label}</div>
            </div>
          ))}
        </section>

        <TripCounter />

        {EVAL_RESULTS && <EvalTeaser />}

        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-xl font-bold">
            <Sparkles className="h-4 w-4" /> How it works
          </h2>
          <ol className="card-chunky space-y-3 p-5 text-sm">
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent font-bold">1</span>
              Snap or upload a photo of the bag.
            </li>
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent font-bold">2</span>
              Pick airline + fare type.
            </li>
            <li className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent font-bold">3</span>
              Get the verdict, official status &amp; confidence score.
            </li>
          </ol>
        </section>

        {recent.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <Ticket className="h-4 w-4" /> Recent chances
              </h2>
              <Link to="/history" className="text-sm font-semibold text-primary">
                See all
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recent.map((h) => (
                <Link
                  key={h.id}
                  to="/result/$id"
                  params={{ id: h.id }}
                  className="card-chunky w-40 shrink-0 overflow-hidden"
                >
                  {h.thumbnail ? (
                    <img src={h.thumbnail} alt="" className="h-24 w-full object-cover" />
                  ) : (
                    <div className="grid h-24 place-items-center text-3xl">🧳</div>
                  )}
                  <div className="p-2">
                    <div className="text-xs font-semibold">{h.airlineName}</div>
                    <div className="mt-1">
                      {h.notBag ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
                          <NotBagBadge size={14} /> Not a bag
                        </span>
                      ) : h.verdict ? (
                        <VerdictBadge traffic={h.verdict.traffic as Traffic} />
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <DisclaimerFooter />
      </main>
    </div>
  );
}

function EvalTeaser() {
  const summaries = summariseAll(EVAL_RESULTS!.rows);
  const best = [...summaries].sort((a, b) => b.fitAgreementPct - a.fitAgreementPct)[0];
  return (
    <Link to="/eval" className="card-chunky mt-6 flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent">
        <FlaskConical className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-extrabold leading-tight">
          Can AI tell if your bag will fit?
        </span>
        <span className="block text-xs text-muted-foreground">
          {summaries.length} models, {EVAL_DATASET.length} bags with known sizes. The best gets the
          pass/fail call right {Math.round(best.fitAgreementPct)}% of the time.
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}
