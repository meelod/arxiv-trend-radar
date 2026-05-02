import { isRead, toggleRead } from '../lib/state';
import { useStateVersion } from '../lib/useLocalState';

export function ReadButton({ id, className = '' }: { id: string; className?: string }) {
  useStateVersion();
  const read = isRead(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleRead(id);
      }}
      className={`shrink-0 inline-flex items-center justify-center rounded-md p-1 transition-colors ${
        read ? 'text-emerald-500 hover:text-emerald-600' : 'text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:text-zinc-400'
      } ${className}`}
      title={read ? 'Mark as unread' : 'Mark as read'}
      aria-label={read ? 'Mark as unread' : 'Mark as read'}
      aria-pressed={read}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </button>
  );
}
