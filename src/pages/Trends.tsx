import { useEffect, useState } from 'react';
import { TrendsReport, listTrends, loadTrends } from '../lib/data';
import { ClusterCard } from '../components/ClusterCard';

function TopAuthors({ report }: { report: TrendsReport }) {
  // Aggregate authors across active (new + growing) clusters
  const activeClusterIds = new Set(
    report.clusters
      .filter((c) => c.status === 'new' || c.status === 'growing')
      .flatMap((c) => c.all_paper_ids || [])
  );

  // If there are no active clusters yet (first report), aggregate across all
  const ids =
    activeClusterIds.size > 0
      ? activeClusterIds
      : new Set(report.clusters.flatMap((c) => c.all_paper_ids || []));

  const authorCounts = new Map<string, number>();
  for (const pid of ids) {
    const meta = report.paper_index[pid];
    if (!meta?.authors) continue;
    for (const a of meta.authors) {
      const name = (a || '').trim();
      if (!name) continue;
      authorCounts.set(name, (authorCounts.get(name) || 0) + 1);
    }
  }

  const top = Array.from(authorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .filter(([, n]) => n >= 2);

  if (top.length === 0) return null;

  const label =
    activeClusterIds.size > 0
      ? 'Top authors in active clusters'
      : 'Top authors across all clusters';

  return (
    <div className="card">
      <h4 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-3">
        {label}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {top.map(([name, count]) => (
          <div key={name} className="flex items-baseline justify-between gap-2">
            <span className="text-zinc-800 dark:text-zinc-200 truncate">{name}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatChanged({ report }: { report: TrendsReport }) {
  const newClusters = report.clusters.filter((c) => c.status === 'new');
  const topGrowers = report.clusters
    .filter((c) => c.status === 'growing')
    .sort((a, b) => (b.delta_pct || 0) - (a.delta_pct || 0))
    .slice(0, 3);
  const dropped = report.dropped_clusters || [];

  if (!report.previous_report_date) {
    return null; // First report — nothing to compare against
  }
  if (newClusters.length === 0 && topGrowers.length === 0 && dropped.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="card">
        <h4 className="text-xs uppercase tracking-wider text-blue-700 font-semibold mb-2">
          New ({newClusters.length})
        </h4>
        {newClusters.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">None</p>
        ) : (
          <ul className="text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
            {newClusters.slice(0, 5).map((c) => (
              <li key={c.cluster_id}>· {c.label}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h4 className="text-xs uppercase tracking-wider text-amber-700 font-semibold mb-2">
          Growing ({topGrowers.length})
        </h4>
        {topGrowers.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">None</p>
        ) : (
          <ul className="text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
            {topGrowers.map((c) => (
              <li key={c.cluster_id}>
                · {c.label}{' '}
                <span className="text-amber-700 font-mono text-xs">+{c.delta_pct}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h4 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-2">
          Dropped ({dropped.length})
        </h4>
        {dropped.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">None</p>
        ) : (
          <ul className="text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
            {dropped.slice(0, 5).map((d, i) => (
              <li key={i} className="text-zinc-600 dark:text-zinc-400">· {d.label || '(unlabeled)'}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

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
      <div className="card text-center text-zinc-500 dark:text-zinc-400 py-12">
        No trend reports yet. The first one will appear after the weekly workflow runs.
      </div>
    );
  }

  if (!report) {
    return <div className="text-zinc-500 dark:text-zinc-400">Loading…</div>;
  }

  const sortedClusters = [...report.clusters].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 99;
    const sb = STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return (b.score || 0) - (a.score || 0);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between flex-wrap gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-700">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Weekly Trends &amp; Gaps</p>
          <h1 className="text-2xl font-semibold mt-1">{report.report_date}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <select
            value={selected ?? ''}
            onChange={(e) => setSelected(e.target.value)}
            className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-sm"
          >
            {available.map((f) => (
              <option key={f} value={f}>
                {f.replace('.json', '')}
              </option>
            ))}
          </select>
          <span className="text-zinc-500 dark:text-zinc-400">{report.paper_count} papers · {report.window_days}d</span>
          {report.previous_report_date && (
            <span className="text-zinc-500 dark:text-zinc-400">vs {report.previous_report_date}</span>
          )}
        </div>
      </div>

      <div className="border-l-4 border-accent-500 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-r-lg">
        <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">{report.overview}</p>
      </div>

      {/* What changed this week */}
      <WhatChanged report={report} />

      {/* Top authors */}
      <TopAuthors report={report} />

      <div className="space-y-4">
        {sortedClusters.map((c) => (
          <ClusterCard key={c.cluster_id} cluster={c} paperIndex={report.paper_index} />
        ))}
      </div>

      {report.dropped_clusters.length > 0 && (
        <div className="border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900">
          <h4 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-2">
            Dropped since last week ({report.dropped_clusters.length})
          </h4>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            {report.dropped_clusters.map((d, i) => (
              <li key={i}>
                {d.label || '(unlabeled)'}
                {d.size != null && <span className="text-zinc-400 dark:text-zinc-500"> — was {d.size} papers</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
