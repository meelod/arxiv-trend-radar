import { Link } from 'react-router-dom';
import { TrendCluster, PaperMeta, slugifyLabel } from '../lib/data';
import { PaperBadge } from './PaperBadge';
import { Sparkline } from './Sparkline';
import { Tooltip } from './Tooltip';

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
    'text-zinc-500 dark:text-zinc-400';

  const slug = slugifyLabel(cluster.label);
  const permalinkPath = reportDate ? `/trends/${reportDate}/${slug}` : null;

  return (
    <div className="card space-y-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold leading-snug flex-1">
          {showPermalink && permalinkPath ? (
            <Link to={permalinkPath} className="hover:underline">{cluster.label}</Link>
          ) : (
            cluster.label
          )}
        </h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          {paperDates.length > 0 && (
            <Tooltip text="Weekly paper count over the last 12 weeks. Each bar = one week. Color matches status.">
              <Sparkline paperDates={paperDates} className={sparkColor} />
            </Tooltip>
          )}
          <Tooltip text={STATUS_TOOLTIPS[status] || ''}>
            <span className={statusPill}>{statusText}</span>
          </Tooltip>
          <span className="pill">{cluster.size} papers</span>
          <Tooltip text={`${cluster.growth_ratio < 0.8 ? 'Cooling' : cluster.growth_ratio > 1.2 ? 'Growing' : 'Roughly steady'}: papers/week recently is ${cluster.growth_ratio}× the prior 8-week baseline.`}>
            <span className="pill">growth ×{cluster.growth_ratio}</span>
          </Tooltip>
          {cluster.confidence && (
            <Tooltip text={CONFIDENCE_TOOLTIPS[cluster.confidence.toLowerCase()] || ''}>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${confidenceClass}`}>
                {cluster.confidence}
              </span>
            </Tooltip>
          )}
        </div>
      </div>

      {cluster.matched_prev_label && cluster.matched_prev_label !== cluster.label && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Last week: "{cluster.matched_prev_label}"</p>
      )}

      <p className="text-zinc-700 dark:text-zinc-300 italic text-sm">{cluster.one_line}</p>

      {cluster.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cluster.keywords.map((k) => (
            <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-900">
              {k}
            </span>
          ))}
        </div>
      )}

      {cluster.existing_companies && cluster.existing_companies.length > 0 && (
        <div>
          <span className="section-label">Existing companies</span>
          <ul className="space-y-1.5">
            {cluster.existing_companies.map((co, i) => (
              <li key={i} className="text-sm">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{co.name}</span>
                {co.stage && co.stage !== 'unknown' && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                    {co.stage}
                  </span>
                )}
                <span className="text-zinc-700 dark:text-zinc-300"> — {co.what_they_do}</span>
                {co.why_relevant && (
                  <span className="text-zinc-500 dark:text-zinc-400 italic"> ({co.why_relevant})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <span className="section-label">Existing landscape</span>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{cluster.existing_landscape}</p>
      </div>

      <div>
        <span className="section-label">Research–industry gap</span>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{cluster.research_industry_gap}</p>
      </div>

      <div>
        <span className="section-label">Startup thesis</span>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{cluster.startup_thesis}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="section-label">Why now</span>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{cluster.why_now}</p>
        </div>
        <div>
          <span className="section-label">Risks</span>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{cluster.risks}</p>
        </div>
      </div>

      {cluster.sample_paper_ids?.length > 0 && (
        <div>
          <span className="section-label">Representative papers</span>
          <div className="flex flex-wrap gap-1.5">
            {cluster.sample_paper_ids.map((id) => (
              <PaperBadge key={id} id={id} meta={paperIndex[id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
