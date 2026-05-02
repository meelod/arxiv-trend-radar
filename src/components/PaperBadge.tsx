import { PaperMeta } from '../lib/data';

function formatCitations(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function PaperBadge({ id, meta }: { id: string; meta?: PaperMeta }) {
  const href = meta?.abs || `https://arxiv.org/abs/${id}`;
  const title = meta?.title || '';
  const truncated = title.length > 60 ? title.slice(0, 59) + '…' : title;
  const label = title ? `${id} · ${truncated}` : id;
  const citations = meta?.citation_count;
  const influential = meta?.influential_count ?? 0;
  const showCitations = typeof citations === 'number' && citations > 0;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 bg-stone-100 dark:bg-stone-800/60 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200/70 dark:border-stone-700/70 rounded-full text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
      title={
        showCitations
          ? `${title}\n\n${citations} citations${influential ? ` (${influential} influential)` : ''}`
          : title
      }
    >
      <span>{label}</span>
      {showCitations && (
        <span
          className="inline-flex items-center gap-0.5 px-1 rounded bg-amber-100/80 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] tabular-nums"
          aria-label={`${citations} citations`}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.39 7.36H22l-6.19 4.5L18.2 21 12 16.5 5.8 21l2.39-7.14L2 9.36h7.61z" />
          </svg>
          {formatCitations(citations)}
        </span>
      )}
    </a>
  );
}
