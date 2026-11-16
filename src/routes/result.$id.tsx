import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowLeft, Copy, RefreshCcw } from "lucide-react";
import { AppHeader, DisclaimerFooter } from "@/components/AppShell";

import { ProfileAvatar, NotBagBadge } from "@/components/Avatar";
import { toneClass, toneEmoji } from "@/components/VerdictBadge";
import { getEntry, type HistoryEntry } from "@/lib/history";
import { TRAFFIC_LABELS, TRAFFIC_TONES, type Traffic } from "@/lib/verdict";

export const Route = createFileRoute("/result/$id")({
  component: ResultPage,
  head: () => ({
    meta: [{ title: "Your verdict — Bag Chancer" }],
  }),
});

function ResultPage() {
  const { id } = useParams({ from: "/result/$id" });
  const [entry, setEntry] = useState<HistoryEntry | null | undefined>(undefined);

  useEffect(() => {
    getEntry(id).then((e) => setEntry(e ?? null));
  }, [id]);

  const tone = entry?.verdict ? TRAFFIC_TONES[entry.verdict.traffic as Traffic] : undefined;

  useEffect(() => {
    if (tone === "green") {
      const end = Date.now() + 800;
      const tick = () => {
        confetti({
          particleCount: 30,
          startVelocity: 35,
          spread: 70,
          origin: { y: 0.3 },
          colors: ["#ff3d8b", "#ffd60a", "#3a86ff", "#06d6a0"],
        });
        if (Date.now() < end) requestAnimationFrame(tick);
      };
      tick();
    }
  }, [tone]);

  if (entry === undefined) return <div className="p-8 text-center">Loading…</div>;
  if (entry === null) {
    return (
      <div className="p-8 text-center">
        <p>That verdict has wandered off.</p>
        <Link to="/check" className="text-primary underline">
          Try again
        </Link>
      </div>
    );
  }

  // Schema/parse fallback: AI replied but we couldn't read it cleanly.
  if (entry.schemaFailed) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-md px-5 pt-4">
          <Link to="/check" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <motion.section
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="card-chunky-lg overflow-hidden p-6 text-center bg-accent"
          >
            <div className="text-5xl">🤔</div>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight">
              Couldn&apos;t read that one properly
            </h1>
            <p className="mt-2 text-sm font-medium italic">
              Try another photo with the full bag in frame.
            </p>
          </motion.section>

          <Link
            to="/check"
            className="btn-chunky mt-6 flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
          >
            <RefreshCcw className="h-4 w-4" /> Try another photo
          </Link>

          <DisclaimerFooter />
        </main>
      </div>
    );
  }

  // Not-a-bag short circuit: the AI vision step said the image wasn't luggage.
  if (!entry.verdict || entry.notBag) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-md px-5 pt-4">
          <Link to="/check" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <motion.section
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="card-chunky-lg overflow-hidden p-6 text-center bg-accent"
          >
            <div className="flex justify-center">
              <NotBagBadge size={96} wobble />
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight">
              Ah here now…
            </h1>
            <p className="mt-2 text-sm font-medium italic">
              {entry.detectedObject
                ? `That's not a bag, that's ${/^[aeiou]/i.test(entry.detectedObject) ? "an" : "a"} ${entry.detectedObject}. Try again with an actual bag — and pop something in for scale.`
                : "That's not a bag. Try again with an actual bag — and pop something in for scale."}
            </p>
            {entry.observation && (
              <p className="mt-3 text-xs text-muted-foreground">{entry.observation}</p>
            )}
          </motion.section>

          <Link
            to="/check"
            className="btn-chunky mt-6 flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
          >
            <RefreshCcw className="h-4 w-4" /> Try another photo
          </Link>

          <DisclaimerFooter />
        </main>
      </div>
    );
  }

  const v = entry.verdict;
  const traffic = v.traffic as Traffic;
  const bandClass = `${toneClass(tone!)} ${tone === "amber" ? "animate-wobble" : tone === "red" ? "animate-siren" : ""}`;
  const copyText = `Bag Chancer says: ${v.headline}\n${v.officialStatus}\n${v.chancerStatus}`;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 pt-4">
        <Link to="/check" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Check another bag
        </Link>

        <motion.section
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className={`card-chunky-lg overflow-hidden p-6 text-center ${bandClass}`}
        >
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest opacity-80">
            <ProfileAvatar size={22} />
            {entry.airlineName} · {entry.fareName}
          </div>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">
            {v.headline}
          </h1>
          <div className="mt-3 inline-block rounded-full bg-background/80 px-3 py-1 text-xs font-bold uppercase text-foreground">
            {toneEmoji(tone!)} {TRAFFIC_LABELS[traffic] ?? traffic}
          </div>
        </motion.section>

        {entry.observation && (
          <ResultCard title="👁️ What the AI saw" delay={0.03}>
            <p className="text-sm italic">{entry.observation}</p>
          </ResultCard>
        )}

        <ResultCard title="📜 Official Status" delay={0.05} showAvatar>
          <p className="text-sm">{v.officialStatus}</p>
          {v.ruleUsed && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <Stat label="Width" value={`${v.effectiveDims.w} cm`} />
              <Stat label="Height" value={`${v.effectiveDims.h} cm`} />
              <Stat label="Depth" value={`${v.effectiveDims.d} cm`} />
            </div>
          )}
        </ResultCard>

        <ResultCard title="✨ Chancer Status" accent delay={0.1} showAvatar>
          <p className="text-sm font-medium italic">{v.chancerStatus}</p>
        </ResultCard>




        <ResultCard title="✅ Recommendations" delay={0.2}>
          <ul className="space-y-2 text-sm">
            {v.recommendation.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span>→</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </ResultCard>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(copyText);
            }}
            className="btn-chunky flex items-center justify-center gap-2 bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground"
          >
            <Copy className="h-4 w-4" /> Copy verdict
          </button>
          <Link
            to="/check"
            className="btn-chunky flex items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
          >
            <RefreshCcw className="h-4 w-4" /> Check another
          </Link>
        </div>

        <DisclaimerFooter />
      </main>
    </div>
  );
}

function ResultCard({
  title,
  children,
  accent,
  delay = 0,
  showAvatar,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
  delay?: number;
  showAvatar?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`card-chunky mt-4 p-5 ${accent ? "bg-accent" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {showAvatar && <ProfileAvatar size={26} />}
      </div>
      {children}
    </motion.section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-base font-bold">{value}</div>
    </div>
  );
}
