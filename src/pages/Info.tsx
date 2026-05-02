import { Link } from 'react-router-dom';

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="space-y-3">
    <h2 className="text-xl font-semibold border-b border-zinc-200 dark:border-zinc-700 pb-2">{title}</h2>
    <div className="text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-3 text-[15px]">{children}</div>
  </section>
);

const Q = ({ q, children }: { q: string; children: React.ReactNode }) => (
  <div>
    <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{q}</p>
    <div className="text-zinc-700 dark:text-zinc-300">{children}</div>
  </div>
);

export default function Info() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-700">
        <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Info</p>
        <h1 className="text-2xl font-semibold mt-1 text-zinc-900 dark:text-zinc-100">How this works</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Reference for the abbreviations, scores, and visualizations on the site.
        </p>
      </div>

      {/* Quick nav */}
      <nav className="card !p-4 text-sm">
        <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-2">Jump to</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
          <li><a href="#daily" className="text-accent-500 hover:underline">Daily briefing</a></li>
          <li><a href="#picks" className="text-accent-500 hover:underline">Top picks ranking</a></li>
          <li><a href="#themes" className="text-accent-500 hover:underline">Themes vs. picks</a></li>
          <li><a href="#trends" className="text-accent-500 hover:underline">Weekly trends</a></li>
          <li><a href="#status" className="text-accent-500 hover:underline">NEW / GROWING / STABLE / SHRINKING</a></li>
          <li><a href="#sparkline" className="text-accent-500 hover:underline">Cluster sparklines</a></li>
          <li><a href="#colors" className="text-accent-500 hover:underline">Category color stripes</a></li>
          <li><a href="#confidence" className="text-accent-500 hover:underline">Confidence tag</a></li>
          <li><a href="#bookmarks" className="text-accent-500 hover:underline">Bookmarks &amp; read state</a></li>
          <li><a href="#hide-read" className="text-accent-500 hover:underline">Hide-read filter</a></li>
          <li><a href="#cadence" className="text-accent-500 hover:underline">Update cadence</a></li>
          <li><a href="#stack" className="text-accent-500 hover:underline">Stack &amp; cost</a></li>
        </ul>
      </nav>

      <Section id="daily" title="What's on the Daily page">
        <p>
          Each morning a pipeline ingests the last 24 hours of arXiv submissions across 14 categories
          (machine learning, NLP, computer vision, robotics, security, hardware architecture, distributed
          computing, databases, software engineering, information retrieval, neural & evolutionary computing,
          multi-agent systems, signal processing, and quantitative trading), then synthesizes them into
          one briefing.
        </p>
        <p>
          The briefing has four parts:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Headline + executive overview</b> — a one-line summary and 3-5 sentence shape-of-the-day.</li>
          <li><b>Top picks</b> — 5-10 papers ranked specifically for your interests, with a "why it matters" snippet.</li>
          <li><b>Themes</b> — 3-5 thematic groupings of the day's papers with a short narrative each.</li>
          <li><b>Worth noting</b> — up to 8 additional one-line mentions of papers that didn't make top picks but are still interesting.</li>
        </ul>
      </Section>

      <Section id="picks" title="How top picks are ranked">
        <Q q="Two-stage pipeline.">
          <p>
            <b>Stage 1 — embedding pre-filter.</b> All ~1000-1500 daily papers are ranked by{' '}
            <b>cosine similarity</b> between each paper's embedding and an embedding of the configured
            interests (a multi-line list specifying which research areas matter). The top 380 most-similar
            papers plus 20 random "wildcards" (for serendipity) — 400 total — are passed to the next stage.
          </p>
          <p className="mt-3">
            <b>Stage 2 — LLM ranking.</b> A single call to <code>gpt-4o-mini</code> reads those 400 abstracts,
            re-ranks by relevance to the same interests, and returns 5-10 picks with a <code>relevance_score</code>{' '}
            from 1-10 plus a personalized "why it matters" sentence.
          </p>
        </Q>
        <Q q="The relevance bars (1-10).">
          <p>
            The bar visualizes the LLM's relevance score. The prompt explicitly instructs:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>10</b> — directly addresses a core stated interest</li>
            <li><b>8</b> — adjacent and clearly relevant</li>
            <li><b>6+</b> — useful tangent</li>
            <li><b>Below 6</b> — should not appear here</li>
          </ul>
        </Q>
      </Section>

      <Section id="themes" title="Themes vs. top picks vs. worth noting">
        <p>
          <b>Themes</b> describe the day at a topic level — "today, three sub-areas dominated." Each theme
          can include any number of papers. Themes answer "what's happening today?"
        </p>
        <p>
          <b>Top picks</b> are personal — "of all today's papers, which 5-10 should you specifically read?"
          These are filtered against your stated interests.
        </p>
        <p>
          <b>Worth noting</b> is a residual category — papers that don't make the top picks but are still
          interesting enough to mention in one sentence.
        </p>
      </Section>

      <Section id="trends" title="Weekly trends &amp; gap analysis">
        <p>
          Once a week (Sundays), a separate workflow takes the last 90 days of papers and runs:
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>KMeans clustering on the embeddings (k=20).</li>
          <li>TF-IDF keywords per cluster.</li>
          <li>Growth ratio: papers in the last 4 weeks divided by papers in the prior 8 weeks.</li>
          <li>Cluster matching against last week's report via cosine similarity on cluster centroids.</li>
          <li>One LLM call to <code>gpt-5.4-mini</code> writes a gap analysis for the top 10 clusters.</li>
        </ol>
        <p>
          The output is a list of clusters, each with a label, an existing-landscape summary, a
          research-industry gap analysis, a startup thesis, a "why now" signal, risks, and a confidence tag.
        </p>
      </Section>

      <Section id="status" title="Status tags: NEW / GROWING / STABLE / SHRINKING">
        <p>
          When this week's report is generated, each cluster's centroid is compared against last week's
          cluster centroids via cosine similarity (threshold 0.85, greedy bipartite matching).
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>NEW</b> — no analogue in last week's report. Either the topic is genuinely new, or last week's clustering grouped these papers differently.</li>
          <li><b>GROWING</b> — matched to a previous cluster, but the paper count is up <b>{">"}20%</b>.</li>
          <li><b>STABLE</b> — matched, paper count within ±20%.</li>
          <li><b>SHRINKING</b> — matched, paper count down <b>{">"}20%</b>.</li>
          <li><b>DROPPED</b> — appeared last week, no clear analogue this week (shown in the "What changed" panel).</li>
        </ul>
        <p>
          On the very first weekly report, every cluster is tagged NEW because there's no previous report
          to compare against. Status becomes meaningful from week two onward.
        </p>
      </Section>

      <Section id="sparkline" title="Cluster sparklines (the tiny bar charts)">
        <p>
          The mini bar chart in each cluster's header is a <b>12-week histogram of paper counts</b> for that
          cluster. Each bar is one calendar week, the height is the number of papers from that week that
          ended up in this cluster. The leftmost bar is 12 weeks ago; the rightmost is the current week.
        </p>
        <p>
          The shape tells you more than the <code>growth ×</code> number does — a steady climb looks
          different from a recent spike, even if both have the same growth ratio.
        </p>
        <p>
          Color matches the status tag: blue (new), amber (growing), gray (stable), red (shrinking).
        </p>
      </Section>

      <Section id="colors" title="Category color stripes">
        <p>
          Each paper card and cluster card gets a colored left border based on its primary arXiv category.
          Helps with visual scanning when many cards are stacked. The mapping isn't load-bearing — it's just
          for orientation. Hover a category pill to see the human-readable name.
        </p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>Blue / purple — AI / ML / NLP / vision (cs.LG, cs.AI, cs.CL, cs.CV, cs.NE)</li>
          <li>Amber / orange — hardware, systems, infra (cs.AR, cs.DC, cs.DB, cs.PF)</li>
          <li>Green — robotics, control (cs.RO, cs.SY)</li>
          <li>Red — security, cryptography (cs.CR)</li>
          <li>Teal — software engineering (cs.SE)</li>
          <li>Cyan — search, retrieval, information theory (cs.IR, cs.IT)</li>
          <li>Sky — signal processing, audio, EE (eess.*)</li>
          <li>Rose — quantitative finance (q-fin.*)</li>
        </ul>
      </Section>

      <Section id="confidence" title="Confidence tag (LOW / MEDIUM / HIGH)">
        <p>
          Each cluster's gap analysis includes a confidence tag from the LLM. This isn't the model's
          confidence in the existence of the cluster — it's the model's self-rating of the gap analysis:
          how likely is the proposed gap real, the thesis non-obvious, and commercially plausible?
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>HIGH</b> — gap is concrete, thesis isn't already obviously being executed.</li>
          <li><b>MEDIUM</b> — plausible but uncertain.</li>
          <li><b>LOW</b> — the model isn't sure the gap is real or thinks it might already be served. Most clusters end up here, which is honest.</li>
        </ul>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm italic">
          The LLM's training cutoff means it can miss recently-funded startups — confidence is best read
          as "directional" and validated separately.
        </p>
      </Section>

      <Section id="bookmarks" title="Bookmarks &amp; read state">
        <p>
          The star and check icons next to each pick let you save papers to read later or mark them done.
          Both states are stored in <b>your browser's localStorage</b> — they survive refreshes but are
          per-device, per-browser. Visit{' '}
          <Link to="/bookmarks" className="text-accent-500 hover:underline">/bookmarks</Link>{' '}
          to see everything you've starred.
        </p>
        <p>
          Clearing browser site data resets both. There is no server-side account.
        </p>
      </Section>

      <Section id="hide-read" title="The 'Hide read' checkbox">
        <p>
          When checked, papers you've marked as read are filtered out of the daily lists. <b>This is
          visual only.</b> The pipeline does not know what you've read, so tomorrow's briefing won't skip
          papers based on read state.
        </p>
      </Section>

      <Section id="cadence" title="Update cadence">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Daily briefing:</b> Mon-Sat at 02:00 UTC (Sunday's run is skipped because it would only see Saturday submissions, and arXiv has no Saturday announcements).</li>
          <li><b>Weekly trends:</b> Sundays at 14:00 UTC.</li>
        </ul>
        <p>
          Both can also be triggered manually from the Actions tab on GitHub.
        </p>
      </Section>

      <Section id="stack" title="Stack &amp; cost">
        <p>
          Python pipeline running in GitHub Actions, OpenAI for embeddings (<code>text-embedding-3-small</code>)
          and synthesis (<code>gpt-4o-mini</code> daily, <code>gpt-5.4-mini</code> weekly), scikit-learn
          for clustering, React + TypeScript + Vite + Tailwind on Vercel.
        </p>
        <p>
          Steady-state cost: about $2/month. Source:{' '}
          <a
            href="https://github.com/meelod/arxiv-trend-radar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-500 hover:underline"
          >
            github.com/meelod/arxiv-trend-radar
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
