import { getBookmarks, removeBookmark } from '../lib/state';
import { useStateVersion } from '../lib/useLocalState';
import { labelWithCode } from '../lib/categories';
import { colorClassFor } from '../lib/categoryColors';

export default function Bookmarks() {
  useStateVersion();
  const items = getBookmarks();

  if (items.length === 0) {
    return (
      <div className="card text-center text-stone-500 dark:text-stone-400 py-16">
        <p className="font-serif text-[20px] text-stone-700 dark:text-stone-300 mb-2">No bookmarks yet.</p>
        <p className="text-sm max-w-md mx-auto leading-relaxed">
          Click the star on any paper to save it here. Bookmarks live in this browser only — clearing site data removes them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <span className="eyebrow">Bookmarks</span>
        <h1 className="h-display text-[40px] sm:text-[48px]">
          {items.length} {items.length === 1 ? 'paper' : 'papers'} saved
        </h1>
      </header>

      <div className="space-y-4">
        {items.map((b) => {
          const primary = b.categories?.[0];
          const colorCls = colorClassFor(primary);
          return (
            <div key={b.id} className={`card border-l-[3px] ${colorCls}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <a
                    href={b.abs || `https://arxiv.org/abs/${b.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <h3 className="font-serif font-semibold text-[18px] leading-[1.25] tracking-tight text-stone-900 dark:text-stone-50 group-hover:text-accent-500 transition-colors">{b.title}</h3>
                  </a>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5 font-mono tabular-nums">
                    {b.id}
                    {b.paper_date && <span> · {b.paper_date}</span>}
                  </p>
                  {b.reason && (
                    <p className="text-[14px] text-stone-600 dark:text-stone-300 mt-3 leading-[1.6]">{b.reason}</p>
                  )}
                  {b.categories && b.categories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {b.categories.slice(0, 4).map((c) => (
                        <span key={c} className="pill" title={labelWithCode(c)}>
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeBookmark(b.id)}
                  className="shrink-0 text-stone-400 dark:text-stone-500 hover:text-accent-500 text-xs font-medium transition-colors"
                  title="Remove bookmark"
                >
                  Remove
                </button>
              </div>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-4 uppercase tracking-[0.14em]">
                Saved {new Date(b.bookmarked_at).toLocaleDateString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
