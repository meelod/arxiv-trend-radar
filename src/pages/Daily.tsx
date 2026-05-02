import { useEffect, useMemo, useState } from 'react';
import { Briefing, listBriefings, loadBriefing } from '../lib/data';
import { PaperBadge } from '../components/PaperBadge';
import { labelWithCode } from '../lib/categories';
import { colorClassFor } from '../lib/categoryColors';

export default function Daily() {
  const [available, setAvailable] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBriefings()
      .then((files) => {
        setAvailable(files);
        if (files.length > 0) setSelected(files[0]);
      })
      .catch((e) => setError(`Could not load briefing list: ${e.message}`));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setBriefing(null);
    loadBriefing(selected)
      .then(setBriefing)
      .catch((e) => setError(`Failed to load ${selected}: ${e.message}`));
  }, [selected]);

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50 text-red-800">{error}</div>
    );
  }

  if (available.length === 0) {
    return (
      <div className="card text-center text-zinc-500 py-12">
        No briefings yet. The first one will appear after the daily workflow runs.
      </div>
    );
  }

  if (!briefing) {
    return <div className="text-zinc-500">Loading…</div>;
  }

  // Stats: how many unique categories represented and how many papers cross-list >=2 categories
  const stats = (() => {
    const papers = Object.values(briefing.paper_index);
    const cats = new Set<string>();
    let crossListed = 0;
    for (const p of papers) {
      (p.categories || []).forEach((c) => cats.add(c));
      if ((p.categories || []).length >= 2) crossListed += 1;
    }
    return { uniqueCategories: cats.size, crossListed };
  })();

  return (
    <div className="space-y-8">
      {/* Header with date selector */}
      <div className="flex items-baseline justify-between flex-wrap gap-3 pb-4 border-b border-zinc-200">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Daily Briefing</p>
          <h1 className="text-2xl font-semibold mt-1">{briefing.headline}</h1>
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
          <span className="text-zinc-500">{briefing.paper_count} papers</span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-x-6 gap-y-1 flex-wrap text-sm text-zinc-600 -mt-2">
        <span>
          <span className="font-semibold text-zinc-900">{briefing.paper_count}</span> papers
        </span>
        <span>
          <span className="font-semibold text-zinc-900">{stats.uniqueCategories}</span> categories
        </span>
        <span>
          <span className="font-semibold text-zinc-900">{stats.crossListed}</span> cross-listed
        </span>
        <span>
          <span className="font-semibold text-zinc-900">{briefing.themes.length}</span> themes ·{' '}
          <span className="font-semibold text-zinc-900">{briefing.top_picks.length}</span> picks
        </span>
      </div>

      {/* Executive overview */}
      <p className="text-zinc-700 leading-relaxed text-[15px]">
        {briefing.executive_overview}
      </p>

      {/* Top picks */}
      {briefing.top_picks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Top picks for you</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {briefing.top_picks.map((pick) => {
              const meta = briefing.paper_index[pick.arxiv_id];
              const primary = meta?.categories?.[0];
              const colorCls = colorClassFor(primary);
              const score = Math.max(0, Math.min(10, pick.relevance_score || 0));
              return (
                <a
                  key={pick.arxiv_id}
                  href={meta?.abs || `https://arxiv.org/abs/${pick.arxiv_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`card block border-l-4 ${colorCls} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-baseline gap-3 mb-1.5">
                    <div className="flex items-center gap-1" title={`Relevance ${score}/10`}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span
                          key={i}
                          className={`block w-1 h-2.5 rounded-sm ${
                            i < score ? 'bg-accent-500' : 'bg-zinc-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">{pick.arxiv_id}</span>
                  </div>
                  <h3 className="font-semibold leading-snug mb-1.5">{pick.title}</h3>
                  <p className="text-zinc-700 text-sm leading-relaxed">{pick.why_it_matters}</p>
                  {meta && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {meta.categories.slice(0, 3).map((c) => (
                        <span key={c} className="pill" title={labelWithCode(c)}>{c}</span>
                      ))}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Themes */}
      {briefing.themes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Today's themes</h2>
          <div className="space-y-3">
            {briefing.themes.map((theme, i) => (
              <div key={i} className="card">
                <h3 className="font-semibold mb-1.5">{theme.name}</h3>
                <p className="text-zinc-700 text-sm leading-relaxed mb-3">{theme.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {theme.paper_ids.map((id) => (
                    <PaperBadge key={id} id={id} meta={briefing.paper_index[id]} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Worth noting */}
      {briefing.worth_noting.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Worth noting</h2>
          <ul className="card divide-y divide-zinc-100 -mt-1 -mx-1 p-1">
            {briefing.worth_noting.map((wn) => {
              const meta = briefing.paper_index[wn.arxiv_id];
              return (
                <li key={wn.arxiv_id} className="px-4 py-3">
                  <a
                    href={meta?.abs || `https://arxiv.org/abs/${wn.arxiv_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-zinc-50 -mx-2 px-2 py-1 rounded transition-colors"
                  >
                    <p className="text-sm text-zinc-800 leading-snug">{wn.one_liner}</p>
                    {meta && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {wn.arxiv_id} · {meta.title.slice(0, 80)}
                        {meta.title.length > 80 ? '…' : ''}
                      </p>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
