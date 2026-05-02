import { getBookmarks, removeBookmark } from '../lib/state';
import { useStateVersion } from '../lib/useLocalState';
import { labelWithCode } from '../lib/categories';
import { colorClassFor } from '../lib/categoryColors';

export default function Bookmarks() {
  useStateVersion();
  const items = getBookmarks();

  if (items.length === 0) {
    return (
      <div className="card text-center text-zinc-500 py-12">
        <p className="font-semibold mb-1">No bookmarks yet.</p>
        <p className="text-sm">
          Click the star on any paper to save it here. Bookmarks live in this browser only — clearing site data removes them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-zinc-200">
        <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Bookmarks</p>
        <h1 className="text-2xl font-semibold mt-1">
          {items.length} {items.length === 1 ? 'paper' : 'papers'} saved
        </h1>
      </div>

      <div className="space-y-3">
        {items.map((b) => {
          const primary = b.categories?.[0];
          const colorCls = colorClassFor(primary);
          return (
            <div key={b.id} className={`card border-l-4 ${colorCls}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <a
                    href={b.abs || `https://arxiv.org/abs/${b.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:underline"
                  >
                    <h3 className="font-semibold leading-snug">{b.title}</h3>
                  </a>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">
                    {b.id}
                    {b.paper_date && <span> · {b.paper_date}</span>}
                  </p>
                  {b.reason && (
                    <p className="text-sm text-zinc-700 mt-2 leading-relaxed">{b.reason}</p>
                  )}
                  {b.categories && b.categories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                  className="shrink-0 text-zinc-400 hover:text-red-600 text-xs font-medium"
                  title="Remove bookmark"
                >
                  Remove
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-3">
                Saved {new Date(b.bookmarked_at).toLocaleDateString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
