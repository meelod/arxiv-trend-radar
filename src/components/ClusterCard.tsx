import { Link } from 'react-router-dom';
import { TrendCluster, PaperMeta, slugifyLabel } from '../lib/data';
import { PaperBadge } from './PaperBadge';
import { Sparkline } from './Sparkline';
import { Tooltip } from './Tooltip';

// Tooltip text explaining how each section is generated. Goal is to make
// the methodology visible without leaving the page — readers can see whether
// a given field came from a deterministic algorithm (clustering, growth
// ratio) vs. LLM synthesis (landscape, gap, thesis) vs. world-knowledge
// retrieval (named companies).
const SECTION_TIPS = {
  landscape:
    "LLM synthesis of the competitive picture given the named companies above. Built from the LLM's training-data knowledge, not a live web search. Treat as a starting point, not authoritative.",
  gap:
    "LLM identifies a capability the cluster's papers unlock that no named company exposes, OR a scale/efficiency assumption their products violate. The prompt forces specifics — references named companies and concrete capabilities, not 'AI for X' generics.",
  thesis:
    "LLM proposes a concrete first product: who the buyer is, what it does, why incumbents would have a hard time copying. The prompt bans 'platform' and 'ecosystem' language and forces a specific first-product description.",
  why_now:
    "LLM ties the thesis to the cluster's quantitative signals — paper-count growth ratio (recent vs. baseline) and week-over-week status (NEW/GROWING/STABLE/SHRINKING). When the LLM cites a specific paper finding, it's drawn from the representative papers fed into the prompt.",
  risks:
    "LLM's honest read of what could kill the thesis. Most common failure mode: a named incumbent ships the missing capability as a feature. The prompt instructs the model to state this explicitly when it applies.",
  companies:
    "LLM-generated from training-data world knowledge — not retrieved from any database or live search. The prompt instructs it to name 3-7 actual companies (with stage + one-liner) and to return an empty list rather than invent names. Recent stealth startups may be missed; verify the list yourself.",
  seminal:
    "Most-cited paper in this cluster per Semantic Scholar. Anchor work the rest of the cluster builds on or reacts to. Picked deterministically by max citation count — not LLM-selected.",
  representative:
    "Papers closest to the cluster's centroid (cosine similarity in embedding space). These are the papers fed to the LLM as context for the per-cluster analysis above.",
  cluster_header:
    "Clusters are computed locally — no LLM. Each paper's title+abstract is embedded with text-embedding-3-small (1536 dims), KMeans groups the last 90 days of papers into 20 clusters, and the top 10 by score (size × growth ratio) are surfaced. The label and analysis come from the LLM, but the grouping itself is deterministic from the embeddings.",
};

const STATUS_TOOLTIPS: Record<string, string> = {
  new: 'NEW: this cluster has no clear analogue in last week\'s report',
  growing: 'GROWING: paper count up >20% vs. last week',
  stable: 'STABLE: paper count within ±20% of last week',
  shrinking: 'SHRINKING: paper count down >20% vs. last week',
};

const CONFIDENCE_TOOLTIPS: Record<string, string> = {
  high: 'HIGH confidence: gap appears real, thesis non-obvious, commercially plausible. Investigate seriously.',
  medium: 'MEDIUM confidence: plausible but uncertain. Skim and judge yourself.',
  low: 'LOW confidence: gap may not be real or already served. Skip the deep dive.',
};

const STATUS_PILL_CLASS: Record<string, string> = {
  new: 'pill-status-new',
  growing: 'pill-status-growing',
  stable: 'pill-status-stable',
  shrinking: 'pill-status-shrinking',
};

// Section-label with an inline info icon. Hover the icon to see how this
// section was generated (deterministic algorithm vs. LLM synthesis vs.
// world-knowledge retrieval).
function SectionLabel({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="section-label !mb-0">{children}</span>
      <Tooltip text={tip}>
        <span
          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 text-[9px] font-semibold text-stone-500 dark:text-stone-400 hover:border-stone-500 hover:text-stone-700 dark:hover:border-stone-400 dark:hover:text-stone-200 cursor-help leading-none"
          aria-label="How this section is generated"
        >
          ?
        </span>
      </Tooltip>
    </div>
  );
}

export function ClusterCard({
  cluster,
  paperIndex,
  reportDate,
  showPermalink = true,
}: {
  cluster: TrendCluster;
  paperIndex: Record<string, PaperMeta>;
  reportDate?: string;
  showPermalink?: boolean;
}) {
  const status = cluster.status || 'new';
  const statusPill = STATUS_PILL_CLASS[status] || 'pill';
  const statusText =
    status === 'new'
      ? 'NEW'
      : `${status.toUpperCase()}${cluster.delta_pct != null ? ` ${cluster.delta_pct >= 0 ? '+' : ''}${cluster.delta_pct}%` : ''}`;
  const confidenceClass =
    cluster.confidence === 'high'
      ? 'bg-green-100 text-green-900'
      : cluster.confidence === 'medium'
        ? 'bg-amber-100 text-amber-900'
        : 'bg-red-100 text-red-900';

  // Pull paper submission dates for the sparkline
  const paperDates = (cluster.all_paper_ids || [])
    .map((id) => paperIndex[id]?.date)
    .filter((d): d is string => Boolean(d));

  // Determine sparkline color by status
  const sparkColor =
    status === 'growing' ? 'text-amber-600' :
    status === 'shrinking' ? 'text-red-500' :
    status === 'new' ? 'text-blue-600' :
    'text-stone-500 dark:text-stone-400';

  const slug = slugifyLabel(cluster.label);
  const permalinkPath = reportDate ? `/trends/${reportDate}/${slug}` : null;

  const confidenceConf =
    cluster.confidence === 'high'
      ? 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 ring-green-200/80 dark:ring-green-800/60'
      : cluster.confidence === 'medium'
        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 ring-amber-200/80 dark:ring-amber-800/60'
        : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 ring-red-200/80 dark:ring-red-800/60';
  void confidenceClass;

  return (
    <article id={`cluster-${slug}`} className="card space-y-5 scroll-mt-24">
      <header className="space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <h3 className="font-serif font-semibold text-[22px] leading-[1.2] tracking-tight text-stone-900 dark:text-stone-50 flex-1 min-w-[260px] flex items-baseline gap-2 flex-wrap">
            <span>
              {showPermalink && permalinkPath ? (
                <Link to={permalinkPath} className="hover:text-accent-500 transition-colors">{cluster.label}</Link>
              ) : (
                cluster.label
              )}
            </span>
            <Tooltip text={SECTION_TIPS.cluster_header}>
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 text-[9px] font-semibold text-stone-500 dark:text-stone-400 hover:border-stone-500 hover:text-stone-700 dark:hover:border-stone-400 dark:hover:text-stone-200 cursor-help leading-none translate-y-[-1px]"
                aria-label="How this cluster was determined"
              >
                ?
              </span>
            </Tooltip>
          </h3>
          {paperDates.length > 0 && (
            <Tooltip text="Weekly paper count over the last 12 weeks. Each bar = one week. Color matches status.">
              <Sparkline paperDates={paperDates} className={sparkColor} />
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Tooltip text={STATUS_TOOLTIPS[status] || ''}>
            <span className={statusPill}>{statusText}</span>
          </Tooltip>
          <span className="pill font-mono tabular-nums">{cluster.size} papers</span>
          <Tooltip text={`${cluster.growth_ratio < 0.8 ? 'Cooling' : cluster.growth_ratio > 1.2 ? 'Growing' : 'Roughly steady'}: papers/week recently is ${cluster.growth_ratio}× the prior 8-week baseline.`}>
            <span className="pill font-mono tabular-nums">growth ×{cluster.growth_ratio}</span>
          </Tooltip>
          {cluster.confidence && (
            <Tooltip text={CONFIDENCE_TOOLTIPS[cluster.confidence.toLowerCase()] || ''}>
              <span className={`text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full font-semibold ring-1 ${confidenceConf}`}>
                {cluster.confidence}
              </span>
            </Tooltip>
          )}
          {typeof cluster.citation_avg === 'number' && cluster.citation_avg > 0 && (
            <Tooltip text={`Avg ${cluster.citation_avg} citations across ${cluster.size} papers (max ${cluster.citation_max}). High avg = mature field, low avg = nascent / emerging research direction.`}>
              <span className="pill font-mono tabular-nums inline-flex items-center gap-1">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l2.39 7.36H22l-6.19 4.5L18.2 21 12 16.5 5.8 21l2.39-7.14L2 9.36h7.61z" />
                </svg>
                avg {cluster.citation_avg}
              </span>
            </Tooltip>
          )}
        </div>

        {cluster.matched_prev_label && cluster.matched_prev_label !== cluster.label && (
          <p className="text-xs text-stone-500 dark:text-stone-400">Last week: &ldquo;{cluster.matched_prev_label}&rdquo;</p>
        )}

        <p className="font-serif italic text-[16px] leading-[1.5] text-stone-700 dark:text-stone-300 max-w-[68ch]">
          {cluster.one_line}
        </p>

        {cluster.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {cluster.keywords.map((k) => (
              <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-accent-50 dark:bg-accent-500/10 text-accent-700 dark:text-accent-300 border border-accent-100 dark:border-accent-500/20">
                {k}
              </span>
            ))}
          </div>
        )}
      </header>

      <hr className="border-stone-200/70 dark:border-stone-800/70" />

      {cluster.existing_companies && cluster.existing_companies.length > 0 && (
        <div>
          <SectionLabel tip={SECTION_TIPS.companies}>Existing companies</SectionLabel>
          <ul className="space-y-1.5">
            {cluster.existing_companies.map((co, i) => (
              <li key={i} className="text-[14px] leading-[1.55]">
                <span className="font-semibold text-stone-900 dark:text-stone-100">{co.name}</span>
                {co.stage && co.stage !== 'unknown' && (
                  <span className="ml-2 pill-mono">{co.stage}</span>
                )}
                <span className="text-stone-700 dark:text-stone-300"> — {co.what_they_do}</span>
                {co.why_relevant && (
                  <span className="text-stone-500 dark:text-stone-400 italic"> ({co.why_relevant})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        <div>
          <SectionLabel tip={SECTION_TIPS.landscape}>Existing landscape</SectionLabel>
          <p className="text-[14px] text-stone-700 dark:text-stone-300 leading-[1.65]">{cluster.existing_landscape}</p>
        </div>
        <div>
          <SectionLabel tip={SECTION_TIPS.gap}>Research–industry gap</SectionLabel>
          <p className="text-[14px] text-stone-700 dark:text-stone-300 leading-[1.65]">{cluster.research_industry_gap}</p>
        </div>
      </div>

      <div className="border-l-[3px] border-accent-500 pl-4 py-1">
        <SectionLabel tip={SECTION_TIPS.thesis}>Startup thesis</SectionLabel>
        <p className="font-serif text-[16px] leading-[1.55] text-stone-800 dark:text-stone-200">{cluster.startup_thesis}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        <div>
          <SectionLabel tip={SECTION_TIPS.why_now}>Why now</SectionLabel>
          <p className="text-[14px] text-stone-700 dark:text-stone-300 leading-[1.65]">{cluster.why_now}</p>
        </div>
        <div>
          <SectionLabel tip={SECTION_TIPS.risks}>Risks</SectionLabel>
          <p className="text-[14px] text-stone-700 dark:text-stone-300 leading-[1.65]">{cluster.risks}</p>
        </div>
      </div>

      {cluster.seminal_paper_id && (() => {
        const sid = cluster.seminal_paper_id;
        const meta = paperIndex[sid];
        const cites = cluster.seminal_citations ?? meta?.citation_count ?? 0;
        const inf = cluster.seminal_influential ?? meta?.influential_count ?? 0;
        return (
          <div>
            <SectionLabel tip={SECTION_TIPS.seminal}>Seminal paper</SectionLabel>
            <Tooltip text={`Most-cited paper in this cluster${inf ? ` (${inf} influential citations)` : ''}. Anchor work the rest of the cluster builds on or reacts to. Citation counts via Semantic Scholar.`}>
              <a
                href={meta?.abs || `https://arxiv.org/abs/${sid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block group rounded-md border border-amber-200/60 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 px-3 py-2 hover:border-amber-300 dark:hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-[10px] font-mono tabular-nums shrink-0">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2l2.39 7.36H22l-6.19 4.5L18.2 21 12 16.5 5.8 21l2.39-7.14L2 9.36h7.61z" />
                    </svg>
                    {cites >= 1000 ? `${(cites / 1000).toFixed(cites >= 10000 ? 0 : 1)}k` : cites}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] leading-snug text-stone-800 dark:text-stone-200 group-hover:text-amber-900 dark:group-hover:text-amber-200">
                      {meta?.title || sid}
                    </p>
                    <p className="text-[10px] font-mono text-stone-500 dark:text-stone-400 mt-0.5">{sid}</p>
                  </div>
                </div>
              </a>
            </Tooltip>
          </div>
        );
      })()}

      {cluster.sample_paper_ids?.length > 0 && (
        <div>
          <SectionLabel tip={SECTION_TIPS.representative}>Representative papers</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {cluster.sample_paper_ids.map((id) => (
              <PaperBadge key={id} id={id} meta={paperIndex[id]} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
