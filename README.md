# arxiv-trend-radar

Personal arXiv research tool. Daily personalized briefing + weekly trend & gap analysis for startup-idea generation.

> See [CLAUDE.md](./CLAUDE.md) for full architecture, decisions, and design rationale.

## Setup

### 1. Repo configuration

[github.com/meelod/arxiv-trend-radar/settings/secrets/actions](https://github.com/meelod/arxiv-trend-radar/settings/secrets/actions)

**Secrets:**

| Name | Value |
|---|---|
| `OPENAI_API_KEY` | `sk-...` |
| `OPENAI_BASE_URL` | (only if non-OpenAI provider) |

**Variables:**

| Name | Value |
|---|---|
| `MODEL_NAME` | `gpt-4o` |
| `TRENDS_MODEL_NAME` | `gpt-5.4-mini` |
| `LANGUAGE` | `English` |
| `CATEGORIES` | `cs.LG, cs.CL, cs.CV, cs.AR, cs.DC, cs.DB, cs.RO, cs.CR, cs.SE, cs.IR, cs.NE, cs.MA, eess.SP, q-fin.TR` |
| `INTERESTS` | (multi-line — see CLAUDE.md for default) |
| `EMAIL` | git author email for workflow commits |
| `NAME` | git author name for workflow commits |

**Settings → Actions → General → Workflow permissions:** Read and write permissions.

### 2. Vercel

1. Sign in to [vercel.com](https://vercel.com) with your GitHub account
2. **Import Project** → select `arxiv-trend-radar`
3. **Framework Preset:** Vite (auto-detected)
4. **Deploy.** No env vars needed.

Subsequent pushes to `main` auto-deploy.

### 3. Backfill the corpus (one-time, ~30 min, ~$6)

Actions tab → **backfill** workflow → **Run workflow**:
- `from_date`: 90 days ago in YYYY-MM-DD
- `until_date`: today in YYYY-MM-DD
- `run_brief`: false (skip — we only need embeddings to seed trends)

### 4. First daily run

Actions tab → **daily** workflow → **Run workflow**. Generates yesterday's briefing.

### 5. First trends report

After the backfill completes: Actions tab → **trends** workflow → **Run workflow**.

### 6. Visit the site

Vercel will give you a URL like `arxiv-trend-radar-xxx.vercel.app`. Visit, see today's briefing.

## Local dev

```bash
# Frontend
npm install
npm run dev

# Pipeline (requires .env with OPENAI_API_KEY, CATEGORIES, etc.)
uv sync
python pipeline/fetch.py --daily
```

## Cost

- Daily briefing (gpt-4o): ~$6/mo
- Embeddings: ~$0.05/mo
- Weekly trends: ~$1.20/mo
- One-time 90-day backfill: ~$6

Set a hard cap of $20/mo at [platform.openai.com/account/billing/limits](https://platform.openai.com/account/billing/limits).

## License

Private use.
