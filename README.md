# arxiv-trend-radar

🔗 **Live site:** [arxiv-trend-radar.vercel.app](https://arxiv-trend-radar.vercel.app)

> ⚠️ **Personal portfolio project — not maintained as a template.** This repo is public so the architecture and design decisions can serve as a reference. It is **not under an open-source license** (see [LICENSE](./LICENSE)). If you want to build similar tooling, please write your own.

Personal arXiv research tool. Daily personalized briefing + weekly trend & gap analysis for startup-idea generation.

> See [CLAUDE.md](./CLAUDE.md) for full architecture, decisions, and design rationale.

## What it does

- **Daily:** ingests ~1000-1500 new arXiv papers across 14 CS / EE / quant-finance categories, generates one synthesized briefing with themes, top picks personalized to my interests, and one-line notes on the rest
- **Weekly:** clusters the last 90 days of papers (KMeans on embeddings), tracks week-over-week cluster growth, asks an LLM for gap analysis identifying research-industry mismatches and proposing startup theses

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the design doc. High-level:

- **Ingestion:** OAI-PMH (arXiv's official bulk metadata channel)
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Daily synthesis:** one structured-output LLM call (`gpt-4o-mini`)
- **Weekly trends:** KMeans clustering + week-over-week delta detection + structured gap analysis (`gpt-5.4-mini`)
- **Pipeline:** Python in GitHub Actions
- **Frontend:** React + TypeScript + Vite + Tailwind, deployed on Vercel
- **Storage:** JSONL files committed to `main` branch (Vercel serves them as static assets)

## Cost

~$2-5/month at steady state. ~$6 one-time backfill.

## Contributions

**Not currently accepted.** This is a personal tool. PRs will be closed unread.

If you find a bug or have a question, feel free to open an issue, but no support is promised.

---

## Setup notes (for me, future-me, or anyone reading)

### Required secrets

Settings → Secrets and variables → Actions → **Secrets** tab:

| Name | Value |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key |
| `INTERESTS` | Multi-line list of personal research interests (drives top-pick ranking) |
| `OPENAI_BASE_URL` | (only if using non-OpenAI provider) |

### Required variables

Same page, **Variables** tab:

| Name | Value |
|---|---|
| `MODEL_NAME` | `gpt-4o-mini` |
| `TRENDS_MODEL_NAME` | `gpt-5.4-mini` |
| `LANGUAGE` | `English` |
| `CATEGORIES` | comma-separated arXiv codes |
| `EMAIL` | git author email for workflow commits |
| `NAME` | git author name for workflow commits |

### Required permissions / settings

- **Settings → Actions → General → Workflow permissions:** Read and write
- **Settings → Actions → General → Fork pull request workflows from outside collaborators:** Require approval for all outside collaborators
- **OpenAI hard spending limit** at [platform.openai.com/account/billing/limits](https://platform.openai.com/account/billing/limits): set $20/mo as a safety cap

### Local dev

```bash
# Frontend
npm install
npm run dev

# Pipeline (requires .env with OPENAI_API_KEY etc.)
uv sync
python pipeline/fetch.py --daily
```

## Security notes for a public repo

- **Workflows are owner-only.** Schedule, workflow_dispatch, and push triggers can only be initiated by the repo owner. External users cannot run the actions.
- **Fork PRs do not get secrets.** GitHub's default behavior strips secret access from PRs originating in forks. Combined with the above, no external party can run code with my OpenAI key.
- **No `pull_request_target` triggers** anywhere — this is the only event that would let a fork PR run with secrets, and we don't use it.
- **Hard spend cap** at OpenAI's level is the final backstop. Even if everything else fails, billing tops out.
