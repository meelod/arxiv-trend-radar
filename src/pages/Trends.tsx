import { useEffect, useState } from 'react';
import { TrendsReport, MacroPattern, listTrends, loadTrends, loadLatestTrends, slugifyLabel } from '../lib/data';
import { ClusterCard } from '../components/ClusterCard';
import { Skeleton } from '../components/Skeleton';
import { ConstellationMap } from '../components/ConstellationMap';
import { Tooltip } from '../components/Tooltip';

const MACRO_TIP =
  "Cross-cluster convergences identified by the LLM in a separate reasoning pass before per-cluster analysis. A pattern requires ≥2 clusters connected by a shared substrate, complementary capability, or competing approach to the same problem. Empty when no genuine cross-cluster pattern exists this period — the LLM is instructed not to invent one.";

const CLUSTERS_TIP =
  "Clusters are computed locally — no LLM. Each paper's title+abstract is embedded with text-embedding-3-small (1536 dims), KMeans groups the last 90 days of papers into 20 clusters, and the top 10 by score (size × growth ratio) are surfaced. Sorted here by status (NEW → GROWING → STABLE → SHRINKING) then by score.";

function HelpIcon({ tip }: { tip: string }) {
  return (
    <Tooltip text={tip}>
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 text-[9px] font-semibold text-stone-500 dark:text-stone-400 hover:border-stone-500 hover:text-stone-700 dark:hover:border-stone-400 dark:hover:text-stone-200 cursor-help leading-none ml-2 translate-y-[-2px]"
        aria-label="How this section is generated"
      >
        ?
      </span>
    </Tooltip>
  );
}

function TopAuthors({ report }: { report: TrendsReport }) {
  // Build a map: cluster_id -> paper_ids (active clusters only)
  const activeClusters = report.clusters.filter(
    (c) => c.status === 'new' || c.status === 'growing'
  );
  // Fall back to all clusters on the first weekly report (no priors to compare).
  const baseClusters = activeClusters.length > 0 ? activeClusters : report.clusters;

  // Score each first/last-author position by paper citation count (or 1 if
  // citations missing). Drops middle-author noise — in CS, the lead-author
  // positions carry the leadership/contribution signal that matters here.
  // Tracks which clusters each author is active in.
  type Stat = { score: number; clusters: Set<string> };
  const stats = new Map<string, Stat>();
  for (const c of baseClusters) {
    for (const pid of c.all_paper_ids || []) {
      const meta = report.paper_index[pid];
      if (!meta?.authors || meta.authors.length === 0) continue;
      // Citation count contributes weight; absent = 1 (minimum signal)
      const weight = (meta.citation_count ?? 0) + 1;
      const lead = [meta.authors[0]];
      if (meta.authors.length > 1) lead.push(meta.authors[meta.authors.length - 1]);
      for (const raw of lead) {
        const name = (raw || '').trim();
        if (!name) continue;
        const s = stats.get(name) ?? { score: 0, clusters: new Set<string>() };
        s.score += weight;
        s.clusters.add(c.label);
        stats.set(name, s);
      }
    }
  }

  // Require at least 2 first/last-author appearances (≥2 score after the +1
  // baseline) to filter homonym/single-paper noise.
  const top = Array.from(stats.entries())
    .filter(([, s]) => s.score >= 3) // ≥2 papers (since each contributes ≥1)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10);

  if (top.length === 0) return null;

  const label =
    activeClusters.length > 0
      ? 'Active researchers'
      : 'Most active researchers (all clusters)';
  const tip =
    'First or last author on cited papers in NEW/GROWING clusters this period. ' +
    'Score is sum of citation counts (+1 per paper as floor). Middle authors are ' +
    'excluded — in CS, first author = lead student, last author = PI/group lead. ' +
    'Names not yet disambiguated by affiliation, so common names may pile up multiple researchers.';

  return (
    <div className="card">
      <h4 className="eyebrow mb-4 flex items-center">
        <span>{label}</span>
        <HelpIcon tip={tip} />
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {top.map(([name, s]) => {
          const clusterLabels = Array.from(s.clusters);
          const shown = clusterLabels.slice(0, 2);
          const extra = clusterLabels.length - shown.length;
          return (
            <div
              key={name}
              className="flex items-baseline justify-between gap-3 border-b border-dotted border-stone-200 dark:border-stone-800 pb-1.5"
            >
              <div className="min-w-0 flex-1">
                <span className="text-stone-800 dark:text-stone-200 truncate block">{name}</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate block">
                  {shown.join(' · ')}
                  {extra > 0 && ` · +${extra} more`}
                </span>
              </div>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-mono tabular-nums shrink-0">
                {s.score}
              </span>
            </div>
          );
        })}
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

  const Block = ({
    color, accent, title, count, children,
  }: { color: string; accent: string; title: string; count: number; children: React.ReactNode }) => (
    <div className="card relative">
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${color}`} />
      <div className="flex items-baseline justify-between mb-3">
        <h4 className={`eyebrow ${accent}`}>{title}</h4>
        <span className="font-serif text-[20px] tabular-nums text-stone-700 dark:text-stone-300">{count}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Block color="bg-blue-500" accent="!text-blue-700 dark:!text-blue-400" title="New" count={newClusters.length}>
        {newClusters.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">None</p>
        ) : (
          <ul className="text-sm text-stone-700 dark:text-stone-300 space-y-1.5">
            {newClusters.slice(0, 5).map((c) => (
              <li key={c.cluster_id} className="leading-snug">{c.label}</li>
            ))}
          </ul>
        )}
      </Block>

      <Block color="bg-amber-500" accent="!text-amber-700 dark:!text-amber-400" title="Growing" count={topGrowers.length}>
        {topGrowers.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">None</p>
        ) : (
          <ul className="text-sm text-stone-700 dark:text-stone-300 space-y-1.5">
            {topGrowers.map((c) => (
              <li key={c.cluster_id} className="flex items-baseline gap-2 leading-snug">
                <span className="flex-1">{c.label}</span>
                <span className="text-amber-700 dark:text-amber-400 font-mono text-[11px] tabular-nums shrink-0">+{c.delta_pct}%</span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block color="bg-stone-400" accent="" title="Dropped" count={dropped.length}>
        {dropped.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">None</p>
        ) : (
          <ul className="text-sm text-stone-600 dark:text-stone-400 space-y-1.5">
            {dropped.slice(0, 5).map((d, i) => (
              <li key={i} className="leading-snug">{d.label || '(unlabeled)'}</li>
            ))}
          </ul>
        )}
      </Block>
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
  const [listLoaded, setListLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [report, setReport] = useState<TrendsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLatestTrends()
      .then((r) => {
        if (cancelled || !r) return;
        setReport((prev) => prev ?? r);
      })
      .catch(() => { /* fall through */ });

    listTrends()
      .then((files) => {
        if (cancelled) return;
        setAvailable(files);
        setListLoaded(true);
        if (files.length > 0) setSelected((s) => s ?? files[0]);
      })
      .catch((e) => setError(`Could not load trend list: ${e.message}`));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    if (report && `${report.report_date}.json` === selected) return;
    // Keep the old report visible while loading the new one — avoids a
    // skeleton flash on top of already-rendered content.
    loadTrends(selected)
      .then(setReport)
      .catch((e) => setError(`Failed to load ${selected}: ${e.message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  if (error) {
    return <div className="card border-red-200 bg-red-50 text-red-800">{error}</div>;
  }

  if (listLoaded && available.length === 0) {
    return (
      <div className="card text-center text-stone-500 dark:text-stone-400 py-12">
        No trend reports yet. The first one will appear after the weekly workflow runs.
      </div>
    );
  }

  if (!report) {
    return <Skeleton variant="trends" />;
  }

  const sortedClusters = [...report.clusters].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 99;
    const sb = STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return (b.score || 0) - (a.score || 0);
  });
  const macroPatterns = report.macro_patterns ?? [];

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="eyebrow">Weekly Trends &amp; Gaps</span>
          <select
            value={selected ?? ''}
            onChange={(e) => setSelected(e.target.value)}
            className="select-clean"
            aria-label="Select report date"
          >
            {available.map((f) => (
              <option key={f} value={f}>
                {f.replace('.json', '')}
              </option>
            ))}
          </select>
        </div>
        <h1 className="h-display text-[40px] sm:text-[52px]">{report.report_date}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-stone-500 dark:text-stone-400">
          <span><span className="font-mono tabular-nums text-stone-700 dark:text-stone-300">{report.paper_count.toLocaleString()}</span> papers</span>
          <span className="w-px h-3 bg-stone-300 dark:bg-stone-700" />
          <span><span className="font-mono tabular-nums text-stone-700 dark:text-stone-300">{report.window_days}</span>-day window</span>
          {report.previous_report_date && (
            <>
              <span className="w-px h-3 bg-stone-300 dark:bg-stone-700" />
              <span>vs <span className="font-mono">{report.previous_report_date}</span></span>
            </>
          )}
        </div>
      </header>

      <p className="pull-quote max-w-[68ch]">{report.overview}</p>

      {macroPatterns.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="h-section">Macro patterns<HelpIcon tip={MACRO_TIP} /></h2>
            <span className="eyebrow">cross-cluster</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {macroPatterns.map((mp: MacroPattern, i: number) => {
              const linkedClusters = mp.cluster_ids
                .map((id: number) => report.clusters.find((c) => c.cluster_id === id))
                .filter((c): c is NonNullable<typeof c> => Boolean(c));
              return (
                <article
                  key={i}
                  className="card border-l-[3px] border-accent-500 bg-accent-50/30 dark:bg-accent-500/5"
                >
                  <h3 className="font-serif font-semibold text-[18px] leading-tight tracking-tight text-stone-900 dark:text-stone-50 mb-2">
                    {mp.name}
                  </h3>
                  <p className="text-[14px] text-stone-700 dark:text-stone-300 leading-[1.6] mb-3">
                    {mp.summary}
                  </p>
                  {linkedClusters.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {linkedClusters.map((c) => (
                        <a
                          key={c.cluster_id}
                          href={`#cluster-${slugifyLabel(c.label)}`}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200/70 dark:border-stone-700/70 transition-colors"
                        >
                          {c.label}
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <WhatChanged report={report} />

      <ConstellationMap clusters={sortedClusters} />

      <TopAuthors report={report} />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="h-section">Clusters<HelpIcon tip={CLUSTERS_TIP} /></h2>
          <span className="eyebrow">{sortedClusters.length} groups</span>
        </div>
        <div className="space-y-4">
          {sortedClusters.map((c) => (
            <ClusterCard
              key={c.cluster_id}
              cluster={c}
              paperIndex={report.paper_index}
              reportDate={report.report_date}
            />
          ))}
        </div>
      </section>

      {report.dropped_clusters.length > 0 && (
        <div className="border border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-5 bg-stone-100/40 dark:bg-stone-900/40">
          <h4 className="eyebrow mb-2">
            Dropped since last week ({report.dropped_clusters.length})
          </h4>
          <ul className="text-sm text-stone-600 dark:text-stone-400 space-y-1">
            {report.dropped_clusters.map((d, i) => (
              <li key={i}>
                {d.label || '(unlabeled)'}
                {d.size != null && <span className="text-stone-400 dark:text-stone-500"> — was {d.size} papers</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
