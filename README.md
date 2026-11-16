# Bag Chancer 🧳

**Will your bag survive the gate?** Snap a photo of your bag, pick your airline and fare, and Bag Chancer tells you whether you'll get it on board on Ireland ↔ UK flights.

It's a playful, mobile-first web app with a serious core. A vision model estimates the bag's size and type from the photo. A rules engine then checks that estimate against each airline's published cabin allowances and gives a traffic-light verdict.

> Bag Chancer is for fun and guidance only. Airline staff always have the final say.

## How it works

```
 photo ──▶ client resize (≤1024px JPEG)
            │
            ▼
   analyzeBag (server function)
   vision LLM → JSON → Zod-validated BagVisionResult
   { isBag, bagType, softOrHard, overpacked, est. W×H×D cm, confidence }
            │
            ├── not a bag? ──▶ "Ah here now…" result, logged but excluded from stats
            ▼
   computeVerdict (pure, deterministic)
   bag dims vs airline + fare allowance → fit margin %
   → grand / borderline / chancing / no chance (+1 band if bulging)
            │
            ▼
   result card + local history (IndexedDB)
```

- **Vision step:** `src/lib/analyzeBag.functions.ts` is a TanStack Start server function. It sends the photo to a multimodal model and validates the response with Zod. The schema is lenient, so a slightly malformed answer degrades gracefully and doesn't crash.
- **Verdict engine:** `src/lib/verdict.ts` is pure TypeScript with no AI involved. It compares the bag against the limit regardless of orientation by sorting both sets of dimensions, works out the worst-side overshoot as a percentage, and maps that onto four bands.
- **Rules data:** `src/lib/airlines.ts` holds hardcoded allowances per airline and fare for Ryanair, Aer Lingus, Aer Lingus Regional, British Airways, easyJet and Loganair.
- **Storage:** history and avatar live in IndexedDB on the device, with a one-time migration from `localStorage`. There are no accounts and nothing is stored on a server.

## Stack

React 19 · TanStack Start / Router · Vite · Tailwind CSS v4 · Framer Motion · Vercel AI SDK · Zod · Cloudflare Workers

## Running locally

```sh
bun install    # or npm install
bun run dev
```

Bag analysis needs an AI gateway key in the server environment (`LOVABLE_API_KEY`). Without one, the app runs and shows a friendly "not configured" message.

## Roadmap

- [ ] Structured output (`generateObject`) in place of parsing JSON out of free text
- [ ] Unit tests for the verdict engine and CI
- [ ] Accuracy eval: a measured set of bag photos, reporting the model's estimation error
- [ ] Real boarding pass scanning by decoding the IATA BCBP barcode in the browser
- [ ] Source links and "last verified" dates for each airline rule
- [ ] Use the small (under-seat) allowance as well as the cabin allowance in the verdict

## Disclaimer

Baggage rules change. Always check your airline's own website before you fly.
