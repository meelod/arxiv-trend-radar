# arxiv-trend-radar

Live: [arxiv-trend-radar.vercel.app](https://arxiv-trend-radar.vercel.app)

Pulls research papers from arXiv every day and produces:

- **Daily briefing** — a short summary of the day's papers and a list of which ones are worth reading.
- **Weekly trend report** — groups of related papers from the past 90 days, noting which directions are growing and where research and industry don't match up yet.

## How it works

A GitHub Actions cron job pulls new papers from arXiv each morning across machine learning, computer vision, robotics, security, hardware architecture, distributed systems, signal processing, and quantitative finance. Each paper is converted to a vector embedding. An OpenAI call writes the daily briefing. Once a week, KMeans clusters the last 90 days of papers and a separate call writes the trend report. The React frontend reads the resulting JSON files.

## Stack

Python in GitHub Actions, OpenAI (embeddings + summaries), scikit-learn (clustering), React + TypeScript + Vite + Tailwind on Vercel.

## License

All rights reserved. See [LICENSE](./LICENSE).
