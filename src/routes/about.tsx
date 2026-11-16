import { createFileRoute } from "@tanstack/react-router";
import { AppHeader, DisclaimerFooter } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — Bag Chancer" },
      {
        name: "description",
        content: "Bag Chancer is a playful Ireland↔UK cabin bag checker. Here's the small print.",
      },
    ],
  }),
});

function AboutPage() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 pt-6">
        <div className="card-chunky-lg p-6 text-center">
          <div className="flex justify-center"><Mascot mood="nervous" /></div>
          <h1 className="mt-3 font-display text-3xl font-extrabold">About Bag Chancer</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A loving, slightly cursed tribute to anyone who has ever sweated at a Ryanair gate.
          </p>
        </div>

        <section className="card-chunky mt-6 space-y-3 p-5 text-sm">
          <h2 className="font-display text-xl font-bold">How the verdict works</h2>
          <p>
            We compare your bag&apos;s dimensions (estimated from your photo, or
            entered manually) against the airline&apos;s published carry-on rules
            for your chosen fare. A small wiggle room band gives us amber.
          </p>
          <p>
            Photos are analysed by AI to estimate size, bag type, and how
            stuffed it looks. Reference objects (bananas, pints, cats) help the
            AI scale things properly.
          </p>
        </section>

        <section className="card-chunky mt-4 space-y-3 bg-accent p-5 text-sm">
          <h2 className="font-display text-xl font-bold">The disclaimer</h2>
          <p>
            Bag Chancer is for fun and guidance only. Airline staff and airport
            rules always have the final say. Dimensions and allowances change.
            <strong> Do not blame the app if a Ryanair employee chooses violence.</strong>
          </p>
        </section>

        <section className="card-chunky mt-4 p-5 text-sm">
          <h2 className="font-display text-xl font-bold">Airlines we cover (V1)</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>Ryanair</li>
            <li>Aer Lingus</li>
            <li>Aer Lingus Regional / Emerald Airlines</li>
            <li>British Airways</li>
            <li>easyJet</li>
            <li>Loganair</li>
          </ul>
        </section>

        <DisclaimerFooter />
      </main>
    </div>
  );
}
