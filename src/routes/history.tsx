import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { AppHeader, DisclaimerFooter } from "@/components/AppShell";
import { ProfileAvatar, NotBagBadge } from "@/components/Avatar";
import { VerdictBadge } from "@/components/VerdictBadge";
import { deleteEntry, loadHistory, type HistoryEntry } from "@/lib/history";
import { type Traffic } from "@/lib/verdict";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({
    meta: [{ title: "Your bag history — Bag Chancer" }],
  }),
});

function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  useEffect(() => {
    loadHistory().then(setItems);
  }, []);

  const remove = async (id: string) => {
    await deleteEntry(id);
    setItems(await loadHistory());
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 pt-6">
        <h1 className="font-display text-3xl font-extrabold">Bag history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved locally on this device.
        </p>

        {items.length === 0 ? (
          <div className="card-chunky mt-8 p-8 text-center">
            <div className="text-5xl">🧳</div>
            <p className="mt-3 font-semibold">No bags checked yet.</p>
            <Link
              to="/check"
              className="btn-chunky mt-4 inline-block bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
            >
              Check your first bag
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {items.map((h) => (
              <li key={h.id} className="card-chunky flex gap-3 overflow-hidden p-3">
                {h.thumbnail ? (
                  <img src={h.thumbnail} alt="" className="h-20 w-20 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-xl bg-muted text-3xl">🧳</div>
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    to="/result/$id"
                    params={{ id: h.id }}
                    className="flex items-center gap-2 text-sm font-bold"
                  >
                    <ProfileAvatar size={20} />
                    {h.airlineName} · {h.fareName}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {h.fromAirport ?? "?"} → {h.toAirport ?? "?"} ·{" "}
                    {new Date(h.createdAt).toLocaleDateString()}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {h.notBag ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                        <NotBagBadge size={18} /> Not a bag
                      </span>
                    ) : h.verdict ? (
                      <>
                        <VerdictBadge traffic={h.verdict.traffic as Traffic} />
                        <span className="text-xs text-muted-foreground">
                          {h.verdict.confidence}% confidence
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => remove(h.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center self-start rounded-full hover:bg-destructive/10"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <DisclaimerFooter />
      </main>
    </div>
  );
}
