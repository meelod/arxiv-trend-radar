import { isBookmarked, toggleBookmark, BookmarkEntry } from '../lib/state';
import { useStateVersion } from '../lib/useLocalState';

export function StarButton({
  entry,
  size = 18,
  className = '',
}: {
  entry: Omit<BookmarkEntry, 'bookmarked_at'>;
  size?: number;
  className?: string;
}) {
  useStateVersion(); // re-render when bookmarks change
  const starred = isBookmarked(entry.id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark(entry);
      }}
      className={`shrink-0 inline-flex items-center justify-center rounded-md p-1 transition-colors ${
        starred ? 'text-amber-500 hover:text-amber-600' : 'text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:text-zinc-400'
      } ${className}`}
      title={starred ? 'Remove bookmark' : 'Bookmark this paper'}
      aria-label={starred ? 'Remove bookmark' : 'Bookmark this paper'}
      aria-pressed={starred}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    </button>
  );
}
