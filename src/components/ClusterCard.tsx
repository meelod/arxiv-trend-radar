import { TrendCluster, PaperMeta } from '../lib/data';
import { PaperBadge } from './PaperBadge';
import { Sparkline } from './Sparkline';

const STATUS_PILL_CLASS: Record<string, string> = {
  new: 'pill-status-new',
  growing: 'pill-status-growing',
  stable: 'pill-status-stable',
  shrinking: 'pill-status-shrinking',
};

export function ClusterCard({
  cluster,
  paperIndex,
}: {
  cluster: TrendCluster;
  paperIndex: Record<string, PaperMeta>;
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
    'text-zinc-500';

  return (
    <div className="card space-y-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold leading-snug flex-1">{cluster.label}</h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          {paperDates.length > 0 && (
            <Sparkline paperDates={paperDates} className={sparkColor} />
          )}
          <span className={statusPill}>{statusText}</span>
          <span className="pill">{cluster.size} papers</span>
          <span className="pill">growth ×{cluster.growth_ratio}</span>
          {cluster.confidence && (
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${confidenceClass}`}>
              {cluster.confidence}
            </span>
          )}
        </div>
      </div>

      {cluster.matched_prev_label && cluster.matched_prev_label !== cluster.label && (
        <p className="text-xs text-zinc-500">Last week: "{cluster.matched_prev_label}"</p>
      )}

      <p className="text-zinc-700 italic text-sm">{cluster.one_line}</p>

      {cluster.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cluster.keywords.map((k) => (
            <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-900">
              {k}
            </span>
          ))}
        </div>
      )}

      <div>
        <span className="section-label">Existing landscape</span>
        <p className="text-sm text-zinc-700 leading-relaxed">{cluster.existing_landscape}</p>
      </div>

      <div>
        <span className="section-label">Research–industry gap</span>
        <p className="text-sm text-zinc-700 leading-relaxed">{cluster.research_industry_gap}</p>
      </div>

      <div>
        <span className="section-label">Startup thesis</span>
        <p className="text-sm text-zinc-700 leading-relaxed">{cluster.startup_thesis}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="section-label">Why now</span>
          <p className="text-sm text-zinc-700 leading-relaxed">{cluster.why_now}</p>
        </div>
        <div>
          <span className="section-label">Risks</span>
          <p className="text-sm text-zinc-700 leading-relaxed">{cluster.risks}</p>
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
