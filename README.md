# arxiv-trend-radar

![arxiv-trend-radar](docs/hero.png)

Live: [arxiv-trend-radar.vercel.app](https://arxiv-trend-radar.vercel.app)

A research-intelligence pipeline that ingests the daily arXiv firehose across 14 CS/AI categories, produces a personalized morning briefing, and — once a week — clusters the last 90 days of papers to surface **where research is converging faster than industry has built the tooling to match**.

It runs fully autonomously on GitHub Actions, costs ~$3/month in API calls, and ships as a static site with no backend.

## The thesis

The weekly report is modeled on the [Etched](https://www.etched.com/) insight: research had consolidated on the transformer architecture while inference hardware stayed general-purpose GPUs — a mismatch large enough to fund a company. This tool is a radar for analogous mismatches. It tracks what the research corpus is *converging* on, tags each research cluster against the existing commercial/OSS landscape, and flags the gaps where the shipping tools haven't caught up yet.

Two outputs, two cadences:

- **Daily briefing** — an executive overview, 3–5 thematic groupings, and 5–10 ranked "top picks" with a per-paper *why-it-matters* personalized to a configured interest profile.
- **Weekly trend report** — ~20 research clusters tagged NEW / GROWING / STABLE / SHRINKING versus the prior week, each with a landscape read, an explicit research-industry gap, a why-now, and a confidence level. Plus cross-cluster "macro patterns" (e.g. multiple inference clusters all hitting the same memory-bandwidth ceiling).

## How it works

### Daily pipeline — a two-stage retrieval funnel

The design principle throughout is **make a few large LLM calls, never thousands of small ones.** There are deliberately no per-paper summaries: an abstract is already the author's summary, so re-summarizing 1,500 of them daily would be pure cost with no added signal. Synthesis happens once, at the briefing level.

1. **Ingest** (`pipeline/fetch.py`) — pulls the previous day's papers via arXiv's OAI-PMH bulk-metadata channel (the officially-blessed path; resumption tokens handle pagination, and the fetch is resume-safe across runner deaths). No LLM, no cost.

2. **Embed** (`pipeline/embed.py`) — each paper's title + abstract → a 1536-dim vector via `text-embedding-3-small`, batched 100/call, rounded to 4 decimals on disk (~3× smaller files). Resume-safe by ID. ~5¢/month.

3. **Filter → rank → write** (`pipeline/daily_brief.py`) — a two-stage funnel:
   - **Stage 1 (cheap, at scale):** embed the interest profile into the same space, rank all papers by cosine similarity, keep the top ~400 — plus 20 random *wildcards* so the briefing preserves serendipity beyond the personalized signal. This is what keeps the expensive call under the token-per-minute ceiling.
   - **Stage 2 (expensive, with judgment):** a single structured-output call (`gpt-4o-mini`, Pydantic schema via LangChain function-calling) reads the shortlist, re-ranks, and writes the briefing. Embeddings answer *"which 400 are worth reading?"*; the LLM answers *"which of those are the best, and why does it matter to this reader?"*

### Weekly pipeline — clustering with week-over-week continuity

`pipeline/trends.py` reuses the embeddings already on disk (no re-embedding):

- **KMeans (fixed k=20)** over the 90-day corpus. Fixed *k* is a deliberate choice over HDBSCAN's better cluster quality: a stable cluster count is what makes week-over-week delta-tracking tractable.
- **Growth ratio** per cluster = papers in the last 4 weeks vs. the prior 8; top clusters ranked by `size × growth`. TF-IDF surfaces per-cluster keywords.
- **Centroid matching across runs** — each report persists its cluster centroids. The next run matches current clusters to the previous week's via cosine similarity + greedy bipartite assignment (threshold 0.85), then tags each NEW / GROWING / STABLE / SHRINKING with a delta percentage. Dropped clusters are carried forward too. This is the machinery that turns a weekly snapshot into an actual *trend*.
- **One gap-analysis call** (`gpt-5.4`) takes the tagged clusters and returns the landscape / gap / why-now / risk / confidence per cluster, plus cross-cluster macro patterns.

### Engineering details worth calling out

- **Hallucinated-ID repair.** Structured-output models occasionally emit a correct paper title with a transposed digit in the arXiv ID — so the link points at a *different* paper. Every ID the LLM returns is validated against the input set; mismatches are recovered by fuzzy-matching the title (`difflib` at a 0.85 cutoff) and patching the ID, dropping only what can't be recovered. The input paper's title is always treated as ground truth. (`validate_briefing_ids`)
- **Citation enrichment as a signal, not a graph.** Semantic Scholar's batch endpoint (cached on disk, 7-day TTL, anonymous rate-limited) annotates the ~25 referenced papers with citation counts — used to badge a "seminal" paper per cluster, compute citation *density* (mature vs. nascent field), and aggregate author affiliations into an "active researchers" view. (`pipeline/citations.py`)
- **Payload discipline.** The shipped JSON keeps full metadata only for papers actually rendered; the long tail is trimmed to date + authors, roughly halving payload size at a 90-day window.
- **Defensive env handling.** An empty `OPENAI_BASE_URL` (from an unset secret) silently breaks the OpenAI SDK — cleared explicitly in every entry point. Date handling is pinned to UTC end-to-end to avoid the missed-day bugs that plague cron + midnight-boundary crawlers.

## Stack

| Layer | Choice |
|---|---|
| Ingestion | Python, arXiv OAI-PMH + Atom API (`requests`, stdlib XML) |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim) |
| Synthesis | `gpt-4o-mini` (daily) / `gpt-5.4` (weekly), LangChain structured output + Pydantic schemas |
| Clustering | scikit-learn KMeans + TF-IDF |
| Citations | Semantic Scholar batch API |
| Storage | JSONL/JSON on `main` — grep-able, diff-able, served as static assets |
| Orchestration | GitHub Actions cron (daily / weekly / manual backfill) |
| Frontend | React 18 + TypeScript + Vite + Tailwind, installable PWA |
| Hosting | Vercel (static, auto-deploy on push) |

No database, no backend server. The pipeline commits data files to `main`; Vercel serves them and the React app reads them same-origin.

## Cost

~$2.75/month, dominated by the two LLM synthesis calls — embeddings and clustering are effectively free:

| | Model | ~$/mo |
|---|---|---|
| Daily briefing | `gpt-4o-mini` | 1.50 |
| Weekly trends | `gpt-5.4` | 1.20 |
| Embeddings | `text-embedding-3-small` | 0.05 |

The two-stage funnel is the cost lever: filtering 1,500 papers down to 400 with embeddings before the expensive call is what keeps the briefing at pennies/day instead of dollars.

## PWA (Install + Offline)

This app is installable and works offline for pages/data you already opened.

- `public/manifest.webmanifest` defines install metadata and icons.
- `public/sw.js` handles caching:
  - app shell: network-first with cache fallback
  - `/data/*`: stale-while-revalidate
  - icons/images: cache-first
- service worker registration is in [`src/main.tsx`](./src/main.tsx) and only runs in production builds.

### Install

- iOS Safari: Share -> Add to Home Screen
- Android Chrome: browser menu -> Install app / Add to Home screen
- Desktop Chrome/Edge: Install icon in address bar

### Local verification

```bash
npm install
npm run build
npm run preview
```

Open the preview URL, load Daily/Trends once, then go offline in DevTools and refresh. The app shell and previously viewed data should still render.

If you change service-worker behavior, bump `VERSION` in [`public/sw.js`](./public/sw.js) to force a new cache namespace.

## License

All rights reserved. See [LICENSE](./LICENSE).
