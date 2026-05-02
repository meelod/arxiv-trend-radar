/**
 * Editorial masthead for the Daily page — big publication nameplate,
 * today's date, issue number, and a tagline. Sits at the top of the home
 * route, above the briefing content. The thin sticky bar in <Layout> is
 * the second tier; this is the "front page of the newspaper" tier.
 */
type Props = {
  date: string;          // briefing date, e.g. "2026-05-02"
  issueNumber: number;   // 1-indexed position among all briefings (latest = total)
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

function formatLong(ymd: string): string {
  // Parse YYYY-MM-DD as local date (not UTC; avoids the off-by-one)
  const [y, m, d] = ymd.split('-').map((s) => parseInt(s, 10));
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]}, ${MONTHS[m - 1]} ${d}, ${y}`;
}

export function Masthead({ date, issueNumber }: Props) {
  return (
    <section
      aria-label="Masthead"
      className="-mx-4 sm:-mx-6 mb-12 border-y-[3px] border-double border-stone-300 dark:border-stone-700 py-10 sm:py-14 text-center"
    >
      <p className="eyebrow mb-4">Personalized arXiv research, daily</p>
      <h1
        className="font-serif font-medium text-[44px] sm:text-[68px] leading-none tracking-[-0.02em] text-stone-900 dark:text-stone-50"
        style={{ fontFeatureSettings: '"ss01", "ss02"' }}
      >
        arxiv<span className="text-accent-500">·</span>radar
      </h1>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
        <span>Vol. 1</span>
        <span aria-hidden className="opacity-50">·</span>
        <span>Issue №&thinsp;{issueNumber}</span>
        <span aria-hidden className="opacity-50">·</span>
        <span>{formatLong(date)}</span>
      </div>
    </section>
  );
}
