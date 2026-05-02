import { PaperMeta } from '../lib/data';

export function PaperBadge({ id, meta }: { id: string; meta?: PaperMeta }) {
  const href = meta?.abs || `https://arxiv.org/abs/${id}`;
  const title = meta?.title || '';
  const truncated = title.length > 60 ? title.slice(0, 59) + '…' : title;
  const label = title ? `${id} · ${truncated}` : id;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:text-zinc-100 transition-colors"
      title={title}
    >
      {label}
    </a>
  );
}
