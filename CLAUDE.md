# arxiv-trend-radar

Personal research tool that ingests arXiv papers daily, produces a personalized briefing each morning, and a weekly trend-and-gap report identifying potential startup ideas where research is consolidating but industry hasn't followed.

This file is project context for AI assistants. It carries forward decisions and reasoning from the original design conversation so that fresh sessions can pick up cold.

---

## What this project is and is NOT

**Is:**
- A daily morning briefing of arXiv papers, synthesized and personalized to the user's interests
- A weekly trend-detection system that finds research-consolidation patterns and proposes startup theses for research-industry gaps
- A static-site React app deployed on Vercel from a private GitHub repo
- Personal use, single-user

**Is NOT:**
- A general arXiv search tool — there are better ones (alphaxiv, Connected Papers, Semantic Scholar)
- A re-summarizer of every paper — we deliberately do not generate per-paper LLM summaries; the abstract is already a summary written by the author. Synthesis happens at the daily/weekly level instead
- An archival research tool — we keep ~120 days of embeddings, prune older
- A multi-tenant product — single user, no signup flows

The Etched analogy is the design north star: research consolidating on transformer architectures plus inference hardware staying general-purpose was the gap that funded a company. This tool's weekly report is meant to surface analogous mismatches between *what research is converging on* and *what industry has built*.

---

## Architecture overview

```
┌─────────────────────── GitHub Actions ───────────────────────┐
│                                                              │
│  daily.yml (02:00 UTC)                                       │
│    ├─ pipeline/fetch.py --daily                              │
│    ├─ pipeline/embed.py                                      │
│    └─ pipeline/daily_brief.py    (ONE LLM call → briefing)   │
│                                                              │
│  trends.yml (Sundays 14:00 UTC)                              │
│    └─ pipeline/trends.py    (cluster + gap analysis)         │
│                                                              │
│  backfill.yml (manual)                                       │
│    └─ pipeline/fetch.py --from X --until Y                   │
│                                                              │
│       commits to data/ on main branch                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Vercel auto-deploys on push)
┌──────────────── Vercel hobby tier ───────────────┐
│                                                  │
│  Vite + React + TS + Tailwind static build       │
│  fetches data/*.json via same-origin             │
│  password gate via SHA-256 hash injected at      │
│   build time from VITE_PASSWORD_HASH env var     │
└──────────────────────────────────────────────────┘
```

---

## Tech stack and rationale

| Layer | Choice | Why |
|---|---|---|
| Ingestion | Python + OAI-PMH + Atom API (`requests`, stdlib `xml.etree`) | OAI-PMH is arXiv's officially-blessed bulk-metadata channel ("the preferred way"). No Scrapy, no `arxiv` library — both add weight without justification. Atom API for specific-id lookups. |
| LLM | OpenAI SDK + LangChain structured-output | Same as the prior project; LangChain's Pydantic structured-output is reliable. |
| Daily briefing model | `gpt-4o` | The daily brief synthesizes ~200 papers, ranks by user interests, writes why-this-matters. This is real reasoning. mini produces shallow output here. $6/mo well-spent. |
| Trends/gap analysis model | `gpt-5.4-mini` | One big call per week analyzing ~10 clusters. Costlier per-token than 4o-mini but reasoning-heavy work. ~$1.20/mo. |
| Embeddings | `text-embedding-3-small` | $0.02/M tokens, basically free at our volume. Upgrading to `-large` is a 6.5× cost increase for marginal clustering gain — not worth it unless we add semantic-search features. |
| Clustering | scikit-learn KMeans | Fixed `k=20` makes week-over-week cluster matching tractable via cosine similarity on centroids. HDBSCAN has better cluster quality but variable cluster count breaks the delta-tracking story. Switch later if needed. |
| Storage | JSONL files in `data/` on main branch | Vercel serves them as static assets. SQLite would need sql.js (~1MB browser bundle) for query support — premature. JSONL is grep-able, diff-able, easy. |
| Frontend | Vite + React 18 + TypeScript + Tailwind + React Router | Vite for clean static build (no Next.js SSR gymnastics on a private repo). TypeScript for safety. Tailwind for fast iteration. React Router for /login → / → /trends. |
| Hosting | Vercel (free hobby tier) | Best React DX, free for private repos, auto-deploys on push, preview deploys per PR. Cloudflare Pages is the alternative if Vercel ever stops working for us. |
| Auth | **None** — site is publicly accessible | The data is derived from public arXiv abstracts. The only mildly private piece is the user's `INTERESTS` configuration. We deemed this not sensitive enough to justify the false security of a client-side hash gate (which doesn't protect data files anyway). If real privacy is ever needed, the right path is Cloudflare Access (free, real server-side gate) in front of Vercel — not client-side obfuscation. |

---

## The pipeline in detail

### 1. `pipeline/fetch.py` — ingestion

Three modes:

```bash
# Daily — runs in cron, fetches yesterday's announced papers
python fetch.py --daily

# Backfill date range — manual workflow_dispatch
python fetch.py --from 2026-04-01 --until 2026-05-01

# Specific paper IDs — for refresh after deep-dive flag
python fetch.py --ids 2604.27689,2604.27855
```

**Daily and backfill use OAI-PMH**: `http://export.arxiv.org/oai2?verb=ListRecords&from=YYYY-MM-DD&until=YYYY-MM-DD&set=cs:cs.AI&metadataPrefix=arXiv`. Resumption tokens handle pagination natively.

**ID lookups use Atom API**: `http://export.arxiv.org/api/query?id_list=...`.

**Output**: `data/papers/{date}.jsonl` (one paper per line — id, title, authors, summary, categories, abs_url, pdf_url, published, updated, comment).

**Resume**: reads existing JSONL files, builds set of done IDs, skips them. Same pattern as the prior project. Survives crashes mid-fetch and across-runner-deaths via GitHub Actions Cache.

**Rate limit**: arXiv's actual policy is "4 requests/sec with 1 sec sleep between bursts." We use a conservative 1 req/sec sustained, which is well within their limits and avoids the 429s the prior project hit on shared GH Actions IPs.

### 2. `pipeline/embed.py` — embeddings

Reads today's papers, embeds `title + " " + summary[:1000]` via `text-embedding-3-small`, writes `data/embeddings/{date}.jsonl` (one record: `{id, v: [1536 floats rounded to 4 decimals]}`).

Batched 100 per API call.

Resume: skips IDs already in the output file.

Storage: ~12KB/paper, ~2MB/day, ~700MB/year unless we prune.

**120-day prune in daily.yml**: `find data/embeddings -name "*.jsonl" -mtime +120 -delete`. Keeps embedding storage capped at ~250MB indefinitely. Trends only reads last 90 days, so 120 is safe.

### 3. `pipeline/daily_brief.py` — daily synthesis (the new design)

**This replaces per-paper summaries entirely.** A single LLM call generates the full briefing.

Input:
- `INTERESTS` repo variable (multi-line list of user's research interests)
- All today's papers (id, title, primary_category, abstract)

Output (Pydantic structured):
```python
class DailyBriefing(BaseModel):
    executive_overview: str       # 3-4 sentences, what's notable today
    themes: list[Theme]           # 3-5 thematic groupings with paper_ids
    top_picks: list[TopPick]      # 5-10 papers ranked by relevance to INTERESTS, with why_it_matters
    worth_noting: list[Note]      # 5-10 brief one-liners

class Theme(BaseModel):
    name: str
    summary: str                  # 1 paragraph
    paper_ids: list[str]

class TopPick(BaseModel):
    arxiv_id: str
    title: str
    why_it_matters: str           # 2 sentences, personalized to INTERESTS
    relevance_score: int          # 1-10

class Note(BaseModel):
    arxiv_id: str
    one_liner: str                # one sentence
```

Saved to `data/briefings/{date}.json`. Frontend renders this as the home page.

Cost: ~$0.20/day on gpt-4o. About $6/month. The single most valuable LLM call in the system.

### 4. `pipeline/trends.py` — weekly trend & gap report

(Same logic as the prior project. Run as a separate workflow on Sundays.)

- Loads last 90 days of papers + embeddings
- KMeans cluster (k=20)
- TF-IDF keywords per cluster
- Growth ratio = (papers in last 4 weeks) / (papers in prior 8 weeks)
- Top 10 clusters by `size × growth`
- Match clusters to previous report's centroids via cosine similarity (threshold 0.85, greedy bipartite)
- Tag each cluster: NEW / GROWING / STABLE / SHRINKING with delta percentage
- Single LLM call (gpt-5.4-mini) takes top clusters with status tags, returns:
  - Overview of what's converging this period
  - For each cluster: label, existing landscape, research-industry gap, startup thesis, why-now, risks, confidence
- Save `data/trends/{date}.json` with per-cluster centroids saved (rounded float32) for next week's matching

Cost: ~$0.30/run × 4 = $1.20/month.

---

## Repo layout

```
arxiv-trend-radar/
├── .github/workflows/
│   ├── daily.yml          # cron: 0 2 * * *  (daily fetch + embed + brief)
│   ├── trends.yml         # cron: 0 14 * * 0 (Sunday weekly trends)
│   └── backfill.yml       # workflow_dispatch with from/until inputs
├── pipeline/
│   ├── fetch.py
│   ├── embed.py
│   ├── daily_brief.py
│   ├── trends.py
│   ├── structures.py      # Pydantic schemas
│   └── prompts/
│       ├── briefing_system.txt
│       └── trends_system.txt
├── src/                   # React app
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Daily.tsx      # the briefing page
│   │   └── Trends.tsx
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── ThemeCard.tsx
│   │   ├── TopPickCard.tsx
│   │   ├── ClusterCard.tsx
│   │   └── PaperBadge.tsx
│   ├── lib/
│   │   ├── auth.ts        # SHA-256 verify against VITE_PASSWORD_HASH
│   │   ├── data.ts        # fetch JSONL/JSON, cache in memory
│   │   └── categories.ts  # arXiv code → human label map
│   └── styles.css
├── public/                # static assets, favicon
├── data/                  # generated; gitignored from source control workflows commit here
│   ├── papers/{date}.jsonl
│   ├── embeddings/{date}.jsonl
│   ├── briefings/{date}.json
│   └── trends/{date}.json
├── index.html             # Vite entry
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── pyproject.toml
├── .gitignore
├── README.md
└── CLAUDE.md              # this file
```

Note: `data/` is committed (Vercel needs to serve it). The pipeline workflows commit data files back to main on each successful run.

---

## Configuration

### GitHub Secrets (Settings → Secrets and variables → Actions → Secrets)

| Name | Value | Required? |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | Yes |
| `INTERESTS` | Multi-line user interests (moved from Variables → Secrets so it's not visible on a public repo) | Yes |
| `OPENAI_BASE_URL` | Custom endpoint | Only if not using OpenAI directly |

### GitHub Variables (Settings → Secrets and variables → Actions → Variables)

| Name | Value | Notes |
|---|---|---|
| `MODEL_NAME` | `gpt-4o-mini` | For daily briefing. Mini handles 1000+ paper synthesis well; switch to `gpt-4o` if quality feels weak. |
| `TRENDS_MODEL_NAME` | `gpt-5.4-mini` | For weekly trends gap analysis |
| `LANGUAGE` | `English` | Output language |
| `CATEGORIES` | `cs.LG, cs.CL, cs.CV, cs.AR, cs.DC, cs.DB, cs.RO, cs.CR, cs.SE, cs.IR, cs.NE, cs.MA, eess.SP, q-fin.TR` | 14 categories |
| `EMAIL` | git author email for workflow commits | |
| `NAME` | git author name for workflow commits | |

NOTE: `INTERESTS` was moved from Variables to Secrets when the repo went public. Variables are world-readable; Secrets are encrypted.

### Default `INTERESTS` (edit to taste)

```
- AI inference infrastructure: specialized silicon, kv-cache management, MoE routing, low-latency serving
- Multi-agent systems and tool-using LLM agents
- Robotics policy learning, especially humanoid manipulation and end-to-end VLA models
- Vector databases, retrieval at scale, ZK proof acceleration
- Quant trading, market microstructure, algorithmic execution
- Hardware-architecture mismatches: where research consolidates on a pattern but industry tools haven't caught up (the Etched thesis)
```

The daily-brief prompt instructs the LLM to use these to rank `top_picks` and personalize `why_it_matters` explanations.

### Vercel environment

Connect Vercel to the private GitHub repo. **No env vars required.** Build command: `npm run build`. Output dir: `dist/`.

---

## Development workflow

```bash
# Install deps
npm install
uv sync   # for pipeline dev, optional locally

# Local dev for frontend
npm run dev      # localhost:5173

# Run a pipeline step locally (with .env containing OPENAI_API_KEY etc.)
cd pipeline
python fetch.py --daily

# Deploy: just push to main
git push origin main
# Vercel detects, builds (~30s), deploys. Site updates within 1 minute.
```

The pipeline scripts run only in GitHub Actions in production. Running them locally is for debugging.

---

## Cost expectations

| | Per month |
|---|---|
| Daily briefing (gpt-4o, ~$0.20/day) | ~$6 |
| Embeddings (text-embedding-3-small) | ~$0.05 |
| Weekly trends (gpt-5.4-mini, ~$0.30/run × 4) | ~$1.20 |
| GitHub Actions minutes (private repo) | Free under 2000 min/mo (we use ~600) |
| Vercel hobby | Free |
| **Total** | **~$7-8/mo** |

One-time backfill of 90 days at deploy time: **~$6** in API costs (~16K papers through enhancement-equivalent processing — actually less because we don't do per-paper enhancement; we just embed and trend-cluster).

OpenAI hard cap recommendation: set $20/mo at platform.openai.com/account/billing/limits as a circuit breaker.

---

## User collaboration preferences (from prior conversation)

These are notes from working with the user on the predecessor project. They likely persist:

- **Direct, no fluff.** Skip preamble like "Great question!" Get to the answer.
- **Concrete cost / time numbers.** When proposing changes, quantify $ and minutes saved/spent. Don't say "this might be cheaper" — say "$1.50/mo less."
- **Honest tradeoffs.** Don't oversell options. If both choices are valid, say so. If a recommendation is opinionated, explain why and give the alternative.
- **Push back when warranted.** The user appreciates being told "no, here's a better way" when they propose something suboptimal — but only if the alternative is genuinely better and you can explain why concretely.
- **No emojis in code or copy** unless explicitly requested.
- **Build > plan** when the path is clear. The user prefers seeing files materialized over long planning docs. But for big architectural shifts (like the daily-briefing pivot), plan briefly first.
- **Avoid silent assumption.** If a default is being picked because the user didn't specify, call it out: "I'm picking X because of Y; tell me if you'd rather Z."
- **The user is technical** but not always a software engineer by trade. Explain mechanics (e.g., what `git pull` does, why caching matters) when relevant. Don't assume deep familiarity with every tool.

---

## Decisions log (with rationale)

| Decision | Why |
|---|---|
| Drop per-paper LLM summaries entirely | Authors' abstracts are already summaries. Re-summarizing 200 abstracts daily produces 200 cards nobody reads. Synthesis at the daily-briefing level is more useful and ~3× cheaper. |
| OAI-PMH for daily/backfill, not RSS | RSS can't do backfill. OAI-PMH supports `from`/`until` natively, lets you recover missed days seamlessly, and is what arXiv themselves call "the preferred way" for keeping an up-to-date copy. |
| KMeans over HDBSCAN | Week-over-week cluster matching needs stable `k`. HDBSCAN's variable cluster count makes the delta-tracking UX (NEW/GROWING/STABLE) noisy. Switch to HDBSCAN later if cluster quality becomes the bottleneck. |
| 90-day window for trends | Long enough to filter weekly noise (~92% week-over-week corpus overlap means trends are stable). Short enough that ~3-month-old papers don't dominate. The "consolidation" signal lives in this window. |
| 120-day embedding prune | 30-day buffer past the trends window. Caps storage at ~250MB indefinitely. |
| Vercel hobby tier | Free private repo deploys, best React DX, auto-deploys on push. Cloudflare Pages is the fallback. |
| Tailwind | Fastest path to clean UI without writing CSS files. If we ever want a component library, Shadcn/Radix work over Tailwind without rewrite. |
| TypeScript | Catches the kind of bugs `data` shape changes silently introduce. Mandatory at this size. |
| Skip SQLite for browser | sql.js adds ~1MB to the bundle. JSON is fine. Add SQLite later only if a browser-side query feature emerges. |
| Hardcode `INTERESTS` as a repo variable | Simple, single-user, version-controlled. UI-based settings can come later if multi-user becomes a thing (it won't). |
| Drop Scrapy + arxiv-library deps | Both were over-engineered for this scale. OAI-PMH is straightforward HTTP + XML parsing. Saves ~30MB of node_modules-equivalent Python deps. |

---

## Public repo security posture

This repo is public. The defenses against external Actions abuse:

- **Workflows are owner-gated.** Each workflow has `if: github.repository_owner == 'meelod'` as belt-and-suspenders.
- **No `pull_request_target` triggers** — this is the only GitHub Actions event that would expose secrets to fork PRs. None of our workflows use it.
- **`pull_request` from forks** would not get secrets anyway (GitHub's default behavior).
- **`workflow_dispatch` and `schedule`** can only be triggered by repo collaborators, not external visitors.
- **Concurrency limits** prevent runaway parallel runs.
- **OpenAI hard spending cap** at the API-key level is the ultimate backstop.

## Known limitations

1. **No auth — site is publicly accessible to anyone with the URL.** Acceptable because the content is derived from public arXiv data and the only marginally private piece (`INTERESTS`) lives in Secrets. Add `Disallow: /` in `public/robots.txt` (already done) to keep search engines out.
2. **Single-user.** No multi-tenant patterns. Adding even a second user with different `INTERESTS` would require restructuring data flow and probably moving to per-user database.
3. **No PDF deep-dive yet.** Phase 2 feature: clicking a paper in the trends report should be able to fetch and summarize the PDF. Currently shows abstract only.
4. **No mobile-first design.** Tailwind responsive defaults will work but UX hasn't been tuned for phone. Daily briefing reads OK on mobile; trends report has wide cluster cards that wrap awkwardly.
5. **Trend report's first ~3 weeks will be NEW-heavy.** Until there's a previous report to compare against, every cluster shows as NEW. After ~4 weeks the delta tags become meaningful.
6. **Backfill is a manual one-time event.** If the daily workflow fails for >7 days, RSS is gone but OAI-PMH still works — operator must manually trigger backfill for the gap. Not automated.

---

## Phase 2 ideas (not committed)

- **PDF deep-dive on flagged papers.** Trends report flags ~10 papers/week as "high-signal." A separate `pdf_fetch.py` downloads + parses + summarizes those. Adds methods/results/limitations beyond the abstract. Cost: ~$0.50/week.
- **Slack / email weekly digest.** Push the trends report to a Slack channel or email instead of requiring the user to visit the site. Adds a webhook step to `trends.yml`.
- **HDBSCAN swap with `prevalence` metric.** Swap KMeans for HDBSCAN; track cluster persistence across reports via topic-keyword overlap instead of centroid match. Cleaner clusters at the cost of harder delta tracking. Worth trying after a few months of data.
- **User-tunable interests in UI.** localStorage-based override of `INTERESTS` env. Lets the user re-rank the daily briefing without redeploying. Requires a settings page and slightly different briefing-generation flow (might need a fast intermediate step).
- **Citation-graph integration.** When OpenAlex / Semantic Scholar APIs return citation counts for a paper, weight `relevance_score` by citations. Helps surface high-impact papers earlier.
- **Multi-language briefing output.** Already plumbed via `LANGUAGE` env var. Untested but should work for Chinese, Spanish, etc.

---

## Reference: the predecessor project

This was rebuilt from scratch after a session working on a fork of [dw-dengwei/daily-arXiv-ai-enhanced](https://github.com/dw-dengwei/daily-arXiv-ai-enhanced). That project's architecture (Scrapy + per-paper enhancement + dual-branch deploy + jQuery-style frontend) accumulated enough debugging surface that a clean rebuild was easier than continued retrofitting.

Lessons from the predecessor that informed this design:
- **Scrapy + arxiv-library was over-engineered.** Both replaced by ~80 lines of OAI-PMH client.
- **Per-paper enhancement is busywork.** Replaced by single daily-briefing call.
- **Date math is a recurring bug source** (UTC vs local, missed days due to crawl + dedup happening across midnight). Fixed by passing `CRAWL_DATE` as an explicit env through every step.
- **Empty-string env vars from missing GitHub secrets** silently break the OpenAI SDK. Fixed by defensively clearing `OPENAI_BASE_URL` if empty in every Python entry point.
- **Workflow's sed-injection of repo info was brittle** — the upstream had baked-in values, not placeholder strings. Replaced with regex-based replace-whatever's-there pattern.
- **Cluster matching across runs requires stable centroids saved in the trend JSON.** This made week-over-week delta detection actually work.
- **The user prefers seeing real numbers** — costs, runtimes, paper counts. Vague "this should be fine" is unsatisfying.

If you're a future Claude session, read this file first. The predecessor's source is at `/Users/meelod/daily-arXiv-ai-enhanced/` if you need to reference patterns or copy code.

---

## Status

- [x] Architecture decided
- [x] CLAUDE.md written
- [ ] Repo scaffolded (next step — Python pipeline + React frontend + workflows)
- [ ] First push to GitHub
- [ ] Vercel connected
- [ ] Secrets and variables configured
- [ ] First backfill run (90 days)
- [ ] First daily briefing produced
- [ ] First weekly trend report produced
- [ ] Domain pointed at Vercel (optional)

Ship target: same evening as scaffold.
