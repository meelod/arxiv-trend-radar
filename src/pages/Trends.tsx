import { useEffect, useState } from 'react';
import { TrendsReport, listTrends, loadTrends } from '../lib/data';
import { ClusterCard } from '../components/ClusterCard';

const STATUS_ORDER: Record<string, number> = {
  new: 0,
  growing: 1,
  stable: 2,
  shrinking: 3,
};

export default function Trends() {
  const [available, setAvailable] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [report, setReport] = useState<TrendsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrends()
      .then((files) => {
        setAvailable(files);
        if (files.length > 0) setSelected(files[0]);
      })
      .catch((e) => setError(`Could not load trend list: ${e.message}`));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setReport(null);
    loadTrends(selected)
      .then(setReport)
      .catch((e) => setError(`Failed to load ${selected}: ${e.message}`));
  }, [selected]);

  if (error) {
    return <div className="card border-red-200 bg-red-50 text-red-800">{error}</div>;
  }

  if (available.length === 0) {
    return (
      <div className="card text-center text-zinc-500 py-12">
        No trend reports yet. The first one will appear after the weekly workflow runs.
      </div>
    );
  }

  if (!report) {
    return <div className="text-zinc-500">Loading…</div>;
  }

  const sortedClusters = [...report.clusters].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 99;
    const sb = STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return (b.score || 0) - (a.score || 0);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between flex-wrap gap-3 pb-4 border-b border-zinc-200">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Weekly Trends &amp; Gaps</p>
          <h1 className="text-2xl font-semibold mt-1">{report.report_date}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <select
            value={selected ?? ''}
            onChange={(e) => setSelected(e.target.value)}
            className="px-3 py-1.5 border border-zinc-300 rounded-lg bg-white text-sm"
          >
            {available.map((f) => (
              <option key={f} value={f}>
                {f.replace('.json', '')}
              </option>
            ))}
          </select>
          <span className="text-zinc-500">{report.paper_count} papers · {report.window_days}d</span>
          {report.previous_report_date && (
            <span className="text-zinc-500">vs {report.previous_report_date}</span>
          )}
        </div>
      </div>

      <div className="border-l-4 border-accent-500 bg-zinc-50 p-4 rounded-r-lg">
        <p className="text-zinc-800 leading-relaxed">{report.overview}</p>
      </div>

      <div className="space-y-4">
        {sortedClusters.map((c) => (
          <ClusterCard key={c.cluster_id} cluster={c} paperIndex={report.paper_index} />
        ))}
      </div>

      {report.dropped_clusters.length > 0 && (
        <div className="border border-dashed border-zinc-300 rounded-lg p-4 bg-zinc-50">
          <h4 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">
            Dropped since last week ({report.dropped_clusters.length})
          </h4>
          <ul className="text-sm text-zinc-600 space-y-1">
            {report.dropped_clusters.map((d, i) => (
              <li key={i}>
                {d.label || '(unlabeled)'}
                {d.size != null && <span className="text-zinc-400"> — was {d.size} papers</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
