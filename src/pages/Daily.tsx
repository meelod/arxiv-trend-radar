import { useEffect, useState } from 'react';
import { Briefing, listBriefings, loadBriefing } from '../lib/data';
import { PaperBadge } from '../components/PaperBadge';
import { StarButton } from '../components/StarButton';
import { ReadButton } from '../components/ReadButton';
import { labelWithCode } from '../lib/categories';
import { colorClassFor } from '../lib/categoryColors';
import { getHideRead, isRead, setHideRead } from '../lib/state';
import { useStateVersion } from '../lib/useLocalState';

export default function Daily() {
  const [available, setAvailable] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  useStateVersion(); // re-render on bookmark/read changes
  const hideRead = getHideRead();

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
      <div className="card text-center text-zinc-500 dark:text-zinc-400 py-12">
        No briefings yet. The first one will appear after the daily workflow runs.
      </div>
    );
  }

  if (!briefing) {
    return <div className="text-zinc-500 dark:text-zinc-400">Loading…</div>;
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
      <div className="flex items-baseline justify-between flex-wrap gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-700">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">Daily Briefing</p>
          <h1 className="text-2xl font-semibold mt-1">{briefing.headline}</h1>
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
          <span className="text-zinc-500 dark:text-zinc-400">{briefing.paper_count} papers</span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-x-6 gap-y-1 flex-wrap text-sm text-zinc-600 dark:text-zinc-400 -mt-2">
        <span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{briefing.paper_count}</span> papers
        </span>
        <span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{stats.uniqueCategories}</span> categories
        </span>
        <span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{stats.crossListed}</span> cross-listed
        </span>
        <span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{briefing.themes.length}</span> themes ·{' '}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{briefing.top_picks.length}</span> picks
        </span>
        <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 ml-auto cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideRead}
            onChange={(e) => setHideRead(e.target.checked)}
            className="accent-accent-500"
          />
          Hide read
        </label>
      </div>

      {/* Executive overview */}
      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-[15px]">
        {briefing.executive_overview}
      </p>

      {/* Top picks */}
      {briefing.top_picks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Top picks for you</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {briefing.top_picks
              .filter((pick) => !(hideRead && isRead(pick.arxiv_id)))
              .map((pick) => {
              const meta = briefing.paper_index[pick.arxiv_id];
              const primary = meta?.categories?.[0];
              const colorCls = colorClassFor(primary);
              const score = Math.max(0, Math.min(10, pick.relevance_score || 0));
              const read = isRead(pick.arxiv_id);
              return (
                <div
                  key={pick.arxiv_id}
                  className={`card border-l-4 ${colorCls} ${read ? 'opacity-60' : ''} transition-opacity`}
                >
                  <div className="flex items-start gap-2">
                    <a
                      href={meta?.abs || `https://arxiv.org/abs/${pick.arxiv_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 hover:opacity-90"
                    >
                      <div className="flex items-baseline gap-3 mb-1.5">
                        <div className="flex items-center gap-1" title={`Relevance ${score}/10`}>
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span
                              key={i}
                              className={`block w-1 h-2.5 rounded-sm ${
                                i < score ? 'bg-accent-500' : 'bg-zinc-200 dark:bg-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">{pick.arxiv_id}</span>
                      </div>
                      <h3 className="font-semibold leading-snug mb-1.5">{pick.title}</h3>
                      <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">{pick.why_it_matters}</p>
                      {meta && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {meta.categories.slice(0, 3).map((c) => (
                            <span key={c} className="pill" title={labelWithCode(c)}>{c}</span>
                          ))}
                        </div>
                      )}
                    </a>
                    <div className="flex flex-col gap-1">
                      <StarButton
                        entry={{
                          id: pick.arxiv_id,
                          title: pick.title,
                          authors: meta?.authors,
                          abs: meta?.abs,
                          categories: meta?.categories,
                          paper_date: meta?.date,
                          reason: pick.why_it_matters,
                        }}
                      />
                      <ReadButton id={pick.arxiv_id} />
                    </div>
                  </div>
                </div>
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
                <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed mb-3">{theme.summary}</p>
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
          <ul className="card divide-y divide-zinc-100 dark:divide-zinc-800 -mt-1 -mx-1 p-1">
            {briefing.worth_noting
              .filter((wn) => !(hideRead && isRead(wn.arxiv_id)))
              .map((wn) => {
              const meta = briefing.paper_index[wn.arxiv_id];
              const read = isRead(wn.arxiv_id);
              return (
                <li
                  key={wn.arxiv_id}
                  className={`px-4 py-3 flex items-start gap-2 ${read ? 'opacity-60' : ''}`}
                >
                  <a
                    href={meta?.abs || `https://arxiv.org/abs/${wn.arxiv_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 hover:bg-zinc-50 dark:bg-zinc-900 -mx-2 px-2 py-1 rounded transition-colors"
                  >
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug">{wn.one_liner}</p>
                    {meta && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {wn.arxiv_id} · {meta.title.slice(0, 80)}
                        {meta.title.length > 80 ? '…' : ''}
                      </p>
                    )}
                  </a>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <StarButton
                      size={16}
                      entry={{
                        id: wn.arxiv_id,
                        title: meta?.title || wn.arxiv_id,
                        authors: meta?.authors,
                        abs: meta?.abs,
                        categories: meta?.categories,
                        paper_date: meta?.date,
                        reason: wn.one_liner,
                      }}
                    />
                    <ReadButton id={wn.arxiv_id} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
