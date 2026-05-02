import { useEffect, useState } from 'react';
import { Briefing, listBriefings, loadBriefing } from '../lib/data';
import { PaperBadge } from '../components/PaperBadge';
import { StarButton } from '../components/StarButton';
import { ReadButton } from '../components/ReadButton';
import { Tooltip } from '../components/Tooltip';
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
      <div className="card text-center text-stone-500 dark:text-stone-400 py-12">
        No briefings yet. The first one will appear after the daily workflow runs.
      </div>
    );
  }

  if (!briefing) {
    return <div className="text-stone-500 dark:text-stone-400">Loading…</div>;
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
    <div className="space-y-10">
      {/* Header */}
      <header className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="eyebrow">Daily Briefing · {selected?.replace('.json', '')}</span>
          <select
            value={selected ?? ''}
            onChange={(e) => setSelected(e.target.value)}
            className="select-clean"
            aria-label="Select briefing date"
          >
            {available.map((f) => (
              <option key={f} value={f}>
                {f.replace('.json', '')}
              </option>
            ))}
          </select>
        </div>
        <h1 className="h-display text-[34px] sm:text-[40px] max-w-[58ch]">
          {briefing.headline}
        </h1>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-y-5 gap-x-4 border-y border-stone-200/80 dark:border-stone-800/80 py-5">
        <div className="stat">
          <span className="stat-num">{briefing.paper_count}</span>
          <span className="stat-label">Papers</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.uniqueCategories}</span>
          <span className="stat-label">Categories</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.crossListed}</span>
          <span className="stat-label">Cross-listed</span>
        </div>
        <div className="stat">
          <span className="stat-num">{briefing.themes.length}</span>
          <span className="stat-label">Themes</span>
        </div>
        <div className="stat">
          <span className="stat-num">{briefing.top_picks.length}</span>
          <span className="stat-label">Picks</span>
        </div>
      </div>

      {/* Executive overview + filter */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <p className="text-stone-700 dark:text-stone-300 leading-[1.7] text-[16px] max-w-[68ch] flex-1 min-w-[280px]">
          {briefing.executive_overview}
        </p>
        <label className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 cursor-pointer select-none mt-1 shrink-0">
          <input
            type="checkbox"
            checked={hideRead}
            onChange={(e) => setHideRead(e.target.checked)}
            className="accent-accent-500"
          />
          Hide read
        </label>
      </div>

      {/* Top picks */}
      {briefing.top_picks.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="h-section">Top picks for you</h2>
            <span className="eyebrow">{briefing.top_picks.length} selected</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={`card relative overflow-hidden border-l-[3px] ${colorCls} ${read ? 'opacity-55' : ''} transition-opacity hover:border-l-accent-500`}
                >
                  <div className="flex items-start gap-3">
                    <a
                      href={meta?.abs || `https://arxiv.org/abs/${pick.arxiv_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <Tooltip text={`Relevance ${score}/10. The LLM rated how strongly this paper aligns with your stated interests. 10 = directly addresses a core interest, 8 = adjacent and clearly relevant, 6+ = useful tangent.`}>
                          <div className="flex items-center gap-2">
                            <div className="flex items-end gap-[2px] h-3">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`block w-[3px] rounded-[1px] ${
                                    i < score ? 'bg-accent-500' : 'bg-stone-200 dark:bg-stone-700'
                                  }`}
                                  style={{ height: `${30 + (i + 1) * 7}%` }}
                                />
                              ))}
                            </div>
                            <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400 tabular-nums">{score}/10</span>
                          </div>
                        </Tooltip>
                        <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500">{pick.arxiv_id}</span>
                      </div>
                      <h3 className="font-serif font-semibold text-[18px] leading-[1.25] tracking-tight mb-2 text-stone-900 dark:text-stone-50 group-hover:text-accent-500">{pick.title}</h3>
                      <p className="text-stone-600 dark:text-stone-300 text-[14px] leading-[1.6]">{pick.why_it_matters}</p>
                      {meta && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {meta.categories.slice(0, 3).map((c) => (
                            <span key={c} className="pill" title={labelWithCode(c)}>{c}</span>
                          ))}
                        </div>
                      )}
                    </a>
                    <div className="flex flex-col gap-1 shrink-0">
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
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="h-section">Today's themes</h2>
            <span className="eyebrow">{briefing.themes.length} groupings</span>
          </div>
          <div className="space-y-4">
            {briefing.themes.map((theme, i) => (
              <div key={i} className="card">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-serif text-[28px] leading-none text-accent-500/80 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-serif font-semibold text-[18px] leading-tight tracking-tight text-stone-900 dark:text-stone-50">
                    {theme.name}
                  </h3>
                </div>
                <p className="text-stone-600 dark:text-stone-300 text-[14px] leading-[1.65] mb-3 pl-[44px]">{theme.summary}</p>
                <div className="flex flex-wrap gap-1.5 pl-[44px]">
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
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="h-section">Worth noting</h2>
            <span className="eyebrow">{briefing.worth_noting.length} items</span>
          </div>
          <ul className="card divide-y divide-stone-200/60 dark:divide-stone-800/60 p-0 overflow-hidden">
            {briefing.worth_noting
              .filter((wn) => !(hideRead && isRead(wn.arxiv_id)))
              .map((wn) => {
              const meta = briefing.paper_index[wn.arxiv_id];
              const read = isRead(wn.arxiv_id);
              return (
                <li
                  key={wn.arxiv_id}
                  className={`px-5 py-3.5 flex items-start gap-3 ${read ? 'opacity-55' : ''} hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors`}
                >
                  <a
                    href={meta?.abs || `https://arxiv.org/abs/${wn.arxiv_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0"
                  >
                    <p className="text-[14px] text-stone-800 dark:text-stone-200 leading-snug">{wn.one_liner}</p>
                    {meta && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 font-mono">
                        {wn.arxiv_id} · <span className="font-sans">{meta.title.slice(0, 80)}{meta.title.length > 80 ? '…' : ''}</span>
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
