import { useEffect, useState } from "react";
import { Heart, Plane, Sparkles, Luggage, Plus, Minus } from "lucide-react";
import { HISTORY_EVENT, loadHistory } from "@/lib/history";
import { bumpStat, loadStats, type Stats } from "@/lib/stats";
import { TRAFFIC_TONES } from "@/lib/verdict";

export function TripCounter() {
  const [stats, setStats] = useState<Stats>({ flightsSurvived: 0, tripsCompleted: 0 });
  const [derived, setDerived] = useState({ tripsCompleted: 0, chanced: 0 });

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      setStats(loadStats());
      const h = await loadHistory();
      if (cancelled) return;
      const realBags = h.filter((e) => !e.notBag && !e.schemaFailed && e.verdict);
      const chanced = realBags.filter((e) => {
        const tone = TRAFFIC_TONES[e.verdict!.traffic as keyof typeof TRAFFIC_TONES];
        return tone === "orange" || tone === "red";
      }).length;
      setDerived({ tripsCompleted: realBags.length, chanced });
    };
    read();
    window.addEventListener("bag-chancer:stats", read);
    window.addEventListener(HISTORY_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      cancelled = true;
      window.removeEventListener("bag-chancer:stats", read);
      window.removeEventListener(HISTORY_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const caughtOut = Math.max(0, derived.chanced - stats.flightsSurvived);

  return (
    <section className="card-chunky mt-8 p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <Sparkles className="h-4 w-4" /> Your travel tally
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <Stat
          icon={<Heart className="h-4 w-4 text-primary" />}
          label="Trips completed"
          value={derived.tripsCompleted}
        />
        <Counter
          icon={<Plane className="h-4 w-4 text-secondary" />}
          label="Flights survived"
          value={stats.flightsSurvived}
          onInc={() => bumpStat("flightsSurvived", 1)}
          onDec={() => bumpStat("flightsSurvived", -1)}
        />
        <Stat icon={<Sparkles className="h-4 w-4" />} label="Times chanced it" value={derived.chanced} />
        <Stat icon={<Luggage className="h-4 w-4" />} label="Times caught out!" value={caughtOut} />
      </div>
    </section>
  );
}

function Counter({
  icon, label, value, onInc, onDec,
}: {
  icon: React.ReactNode; label: string; value: number;
  onInc: () => void; onDec: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-foreground bg-card p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 flex items-center justify-between">
        <div className="font-display text-3xl font-extrabold">{value}</div>
        <div className="flex gap-1">
          <button onClick={onDec} className="grid h-7 w-7 place-items-center rounded-full border-2 border-foreground bg-card" aria-label="Decrease">
            <Minus className="h-3 w-3" />
          </button>
          <button onClick={onInc} className="grid h-7 w-7 place-items-center rounded-full border-2 border-foreground bg-accent" aria-label="Increase">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-foreground/40 bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-3xl font-extrabold">{value}</div>
    </div>
  );
}
