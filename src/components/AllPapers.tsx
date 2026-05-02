import { useEffect, useMemo, useState } from 'react';
import { RawPaper, loadRawPapers } from '../lib/data';
import { labelWithCode } from '../lib/categories';
import { Tooltip } from './Tooltip';

const ALL_PAPERS_TIP =
  "The full arXiv feed for this date — every paper fetched before any LLM filtering. Lazy-loaded on expand from data/papers/{date}.jsonl. Useful for spotting something the briefing missed, scanning the long tail, or browsing by primary arXiv category. No LLM mediation, no ranking.";

/**
 * Lazy-loads the raw `data/papers/{date}.jsonl` for the selected briefing
 * date and renders every paper fetched that day, with text + category
 * filtering. Surfaces the long tail the LLM filtered out — no LLM mediation.
 *
 * The pipeline filters ~1500 daily papers down to ~25 referenced in the
 * briefing JSON. This component lets the user browse the other ~1475 if
 * they want to spot something the LLM missed or simply scan the full feed.
 */
export function AllPapers({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [papers, setPapers] = useState<RawPaper[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // Reset when the user switches dates.
  useEffect(() => {
    setOpen(false);
    setPapers(null);
    setError(null);
    setQuery('');
    setActiveCat(null);
  }, [date]);

  useEffect(() => {
    if (!open || papers !== null || loading) return;
    setLoading(true);
    loadRawPapers(date)
      .then((p) => setPapers(p))
      .catch((e) => setError(`Could not load papers for ${date}: ${e.message}`))
      .finally(() => setLoading(false));
  }, [open, papers, loading, date]);

  // Top categories in the dataset for quick filter chips.
  const categoryCounts = useMemo(() => {
    if (!papers) return [];
    const counts = new Map<string, number>();
    for (const p of papers) {
      const primary = p.categories?.[0];
      if (!primary) continue;
      counts.set(primary, (counts.get(primary) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [papers]);

  const filtered = useMemo(() => {
    if (!papers) return [];
    const q = query.trim().toLowerCase();
    return papers.filter((p) => {
      if (activeCat && p.categories?.[0] !== activeCat) return false;
      if (!q) return true;
      const hay = `${p.title} ${(p.authors || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [papers, query, activeCat]);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="h-section flex items-baseline">
          <span>All papers</span>
          <Tooltip text={ALL_PAPERS_TIP}>
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 text-[9px] font-semibold text-stone-500 dark:text-stone-400 hover:border-stone-500 hover:text-stone-700 dark:hover:border-stone-400 dark:hover:text-stone-200 cursor-help leading-none ml-2 translate-y-[-2px]"
              aria-label="How this section is generated"
            >
              ?
            </span>
          </Tooltip>
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-accent-500 hover:underline"
        >
          {open ? 'Hide' : `Show all from ${date}`}
        </button>
      </div>

      {!open && (
        <p className="text-[13px] text-stone-500 dark:text-stone-400 leading-relaxed max-w-[68ch]">
          The full arXiv feed for this date — every paper fetched before any LLM filtering.
          Useful for spotting something the briefing missed, or scanning the long tail
          of what was published.
        </p>
      )}

      {open && (
        <div className="card space-y-4">
          {error && (
            <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
          )}

          {loading && (
            <p className="text-sm text-stone-500 dark:text-stone-400">Loading papers…</p>
          )}

          {papers && (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by title or author"
                  className="flex-1 min-w-[200px] text-sm px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900/40 text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:border-accent-500"
                  aria-label="Filter papers"
                />
                <span className="text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400 shrink-0">
                  {filtered.length} / {papers.length}
                </span>
              </div>

              {categoryCounts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveCat(null)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      activeCat === null
                        ? 'bg-accent-50 dark:bg-accent-500/10 text-accent-700 dark:text-accent-300 border-accent-200 dark:border-accent-500/30'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    All
                  </button>
                  {categoryCounts.map(([cat, n]) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCat(activeCat === cat ? null : cat)}
                      title={labelWithCode(cat)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors font-mono ${
                        activeCat === cat
                          ? 'bg-accent-50 dark:bg-accent-500/10 text-accent-700 dark:text-accent-300 border-accent-200 dark:border-accent-500/30'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {cat} <span className="opacity-60">{n}</span>
                    </button>
                  ))}
                </div>
              )}

              <ul className="divide-y divide-stone-200/60 dark:divide-stone-800/60 max-h-[600px] overflow-y-auto -mx-2">
                {filtered.slice(0, 500).map((p) => {
                  const primary = p.categories?.[0] || '';
                  const authors = p.authors || [];
                  const authorStr =
                    authors.length === 0
                      ? ''
                      : authors.length <= 3
                        ? authors.join(', ')
                        : `${authors[0]} et al. (${authors.length})`;
                  return (
                    <li key={p.id} className="px-2 py-2.5">
                      <a
                        href={p.abs || `https://arxiv.org/abs/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group"
                      >
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-[14px] text-stone-800 dark:text-stone-200 group-hover:text-accent-500 leading-snug">
                            {p.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="font-mono">{p.id}</span>
                          {primary && (
                            <>
                              <span className="text-stone-300 dark:text-stone-600">·</span>
                              <span className="font-mono pill-mono">{primary}</span>
                            </>
                          )}
                          {authorStr && (
                            <>
                              <span className="text-stone-300 dark:text-stone-600">·</span>
                              <span className="truncate">{authorStr}</span>
                            </>
                          )}
                        </div>
                      </a>
                    </li>
                  );
                })}
                {filtered.length > 500 && (
                  <li className="px-2 py-3 text-xs text-stone-500 dark:text-stone-400 italic">
                    Showing first 500 of {filtered.length} matches — refine the filter to narrow.
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
