# Bag Chancer 🧳

**Will your bag survive the gate?** Snap a photo of your bag, pick your airline and fare, and Bag Chancer tells you whether you'll get it on board on Ireland ↔ UK flights.

It's a playful, mobile-first web app with a serious core. **The model estimates; the code decides.** A vision model only estimates the bag's size and type from the photo. Plain, tested TypeScript then checks that estimate against each airline's published cabin allowances and gives the traffic-light verdict. The model never decides whether you pass.

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

## Does it actually work? The eval

Product photos of **21 real bags with manufacturer-published dimensions** are run through the exact prompt the app uses, and each estimate is scored against the published size. The bags range from 40 cm under-seat backpacks to an 87 cm hold case. Results are live at [`/eval`](src/routes/eval.tsx), and the harness is in [`src/lib/eval/`](src/lib/eval). Running it spends AI credits, so the runner is gated by a token whose SHA-256 hash is the only thing stored in the repo.

| Model | Avg error | Sides within ±3 cm | Fit call right¹ | Exact band² | Median latency | Tokens in / out |
|---|---|---|---|---|---|---|
| `google/gemini-3.8-flash` | **2.6 cm** (7.4%) | **65%** | 85.7% | 82.5% | 7.5 s | 1,503 / 531 |
| `google/gemini-2.5-flash` *(current)* | 3.5 cm (9.2%) | **65%** | **88.9%** | **85.7%** | 4.4 s | 1,503 / 473 |
| `anthropic/claude-sonnet-5` | 3.5 cm (10.2%) | 51% | 81.0% | 74.6% | 2.9 s | 2,797 / 225 |
| `openai/gpt-5.6-terra` | 4.0 cm (12.5%) | 44% | 76.2% | 65.1% | 2.1 s | 2,310 / 96 |
| `google/gemini-3.1-flash-lite` | 4.4 cm (11.1%) | 52% | 82.5% | 74.6% | 2.5 s | 1,503 / 140 |

¹ Would the app give the same pass/fail answer from the estimate as from the real dimensions? Scored against Ryanair's free bag, easyJet's free bag and Ryanair's Priority cabin bag (63 decisions per model). ² The same traffic-light colour.

**What I learned**

- **Lower size error doesn't mean better decisions.** Gemini 3.8 Flash estimates sizes best, but 2.5 Flash makes slightly more correct pass/fail calls. The verdict only flips near the airline limits, so errors there matter far more than errors on bags that clearly pass or fail. The metric that matters to users is the fit call, not centimetres.
- **The main failure is scale ambiguity.** In a studio shot with nothing for scale, a 78 cm checked case looks the same as a 55 cm cabin case. Gemini 2.5 Flash and Flash Lite estimated 2–3 of the 5 checked cases at about 55 cm. Gemini 3.8 Flash and GPT-5.6 Terra didn't. On the two photos with a person holding the bag, error fell sharply (e.g. 3.9 → 0.0 cm for 2.5 Flash). This is the evidence behind asking users to include a reference object.
- **Models snap to standard sizes.** Predictions cluster on airline sizes such as 40×30×20, 45×36×20 and 55×40×20. That helps on bags made to those sizes (every model got the 45×36×20 case exactly right) and hurts on everything else. The dataset is skewed towards sizer-sized bags, so these numbers are probably optimistic for odd-shaped bags.
- **Integration bugs show up in an eval before anywhere else.** The first run found that the gateway only serves Claude via the native Messages API, that OpenAI rejects AVIF images, and that the cheaper models hit rate limits. Rate-limited calls are retried rather than scored as model failures.

**Limitations:** 21 items is small. A difference of a few points in the fit call is about two decisions, so it's within noise. The photos are retail shots, not phone photos taken in a hallway. The next step is a set of real phone photos with measured dimensions.

### Running the eval yourself

1. Deploy the app with an AI gateway key in the server environment (`LOVABLE_API_KEY`).
2. Choose your own eval token and put its SHA-256 hash in `EVAL_TOKEN_SHA256` in [`runEval.functions.ts`](src/lib/eval/runEval.functions.ts) (`echo -n "your-token" | shasum -a 256`).
3. Open `/eval?key=your-token`, pick models from the list the gateway returns, and click **Fresh run**. **Retry failures + add new models** re-runs only failed checks and merges them into the saved run.
4. Open **Export JSON** and paste it into [`results.ts`](src/lib/eval/results.ts) to update the published numbers.

The dataset ([`dataset.ts`](src/lib/eval/dataset.ts)) stores links to retailer product photos plus the published dimensions and a source URL for each. The images themselves are not stored in this repo. Scoring ([`metrics.ts`](src/lib/eval/metrics.ts)) is pure TypeScript with no network calls.

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
- [x] Accuracy eval against manufacturer dimensions, comparing 5 models ([`/eval`](src/routes/eval.tsx))
- [ ] Eval set of real phone photos with measured dimensions and reference objects
- [ ] Real boarding pass scanning by decoding the IATA BCBP barcode in the browser
- [ ] Source links and "last verified" dates for each airline rule
- [ ] Use the small (under-seat) allowance as well as the cabin allowance in the verdict

## Disclaimer

Baggage rules change. Always check your airline's own website before you fly.

## Licence

[MIT](LICENSE). Code only: the product photos used in the eval belong to their owners and are linked, not included.
