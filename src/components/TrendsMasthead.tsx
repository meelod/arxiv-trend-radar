import { TrendsReport } from '../lib/data';

/**
 * Magazine front-cover masthead for the Trends report.
 * Editorial composition: publication strip → oversized typographic date →
 * asymmetric body (italic lede + at-a-glance data panel).
 *
 * Per DESIGN.md: typography does the heavy lifting, hairlines never shadows,
 * accent used sparingly (here only on the focused selector). Both modes share
 * the same composition; only color tokens swap.
 */
export function TrendsMasthead({
  report,
  available,
  selected,
  onSelect,
}: {
  report: TrendsReport;
  available: string[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  // Issue number = position of this report in chronological order (oldest = 01).
  // Stable across selections; reflects how many reports have been published.
  const sortedAsc = [...available].sort();
  const issueIdx = selected ? sortedAsc.indexOf(selected) : -1;
  const issueNum = issueIdx >= 0 ? issueIdx + 1 : sortedAsc.length;
  const issueStr = String(issueNum).padStart(2, '0');

  // Compose the date — "02 MAY 2026" in the dateline, plus year as a discreet
  // subscript element under the day-month. Avoids locale ambiguity by using
  // explicit UTC parsing of the YYYY-MM-DD string.
  const [yyyy, mm, dd] = report.report_date.split('-');
  const monthName = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)))
    .toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
    .toUpperCase();

  return (
    <header className="space-y-0">
      {/* Publication strip — top hairline + thin metadata band + bottom hairline */}
      <div className="border-y-2 border-stone-900 dark:border-stone-100 py-2.5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.22em] text-stone-800 dark:text-stone-200">
            <span className="font-bold">arxiv·radar</span>
            <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
            <span>The Trends Report</span>
            <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">·</span>
            <span>Issue {issueStr}</span>
          </div>
          <select
            value={selected ?? ''}
            onChange={(e) => onSelect(e.target.value)}
            className="bg-transparent border-0 text-[10px] font-mono uppercase tracking-[0.22em] text-stone-700 dark:text-stone-300 focus:outline-none focus:text-accent-500 cursor-pointer"
            aria-label="Select report date"
          >
            {available.map((f) => (
              <option key={f} value={f}>
                {f.replace('.json', '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero dateline — the cover element */}
      <div className="py-8 sm:py-10 text-center">
        {/* Day + month on one line, year inline as a small italic subscript */}
        <div className="font-serif font-medium tracking-tight text-stone-900 dark:text-stone-50 leading-[1] flex items-baseline justify-center gap-3 sm:gap-4 flex-wrap">
          <span className="text-[52px] sm:text-[72px] md:text-[88px]">
            {dd}{' '}
            <span className="font-light tracking-tight">{monthName}</span>
          </span>
          <span className="text-[28px] sm:text-[36px] md:text-[42px] font-normal italic text-stone-500 dark:text-stone-400">
            {yyyy}
          </span>
        </div>
        <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.32em] text-stone-500 dark:text-stone-400">
          The Weekly Trends Report
        </p>
      </div>

      {/* Hairline rule above body */}
      <div className="border-t border-stone-900 dark:border-stone-100" />

      {/* Asymmetric body — italic lede on the left, at-a-glance panel on the right */}
      <div className="grid grid-cols-12 gap-x-8 gap-y-8 py-10">
        <div className="col-span-12 md:col-span-8 lg:col-span-8">
          <p className="text-[9px] font-mono uppercase tracking-[0.32em] text-stone-500 dark:text-stone-400 mb-4">
            Overview
          </p>
          <p className="font-serif italic text-[15px] sm:text-[16px] leading-[1.6] text-stone-800 dark:text-stone-100 max-w-[60ch]">
            {report.overview}
          </p>
        </div>

        <aside className="col-span-12 md:col-span-4 lg:col-span-4 md:border-l md:border-stone-300 dark:md:border-stone-700 md:pl-6">
          <p className="text-[9px] font-mono uppercase tracking-[0.32em] text-stone-500 dark:text-stone-400 mb-4">
            At a glance
          </p>
          <dl className="space-y-2.5 text-sm">
            <Row label="Papers" value={report.paper_count.toLocaleString()} />
            <Row label="Clusters" value={String(report.clusters.length)} />
            <Row label="Window" value={`${report.window_days} d`} />
            {report.previous_report_date && (
              <Row label="vs." value={report.previous_report_date} mono />
            )}
            <Row label="Model" value={report.model || '—'} mono />
          </dl>
        </aside>
      </div>

      {/* Bottom rule closes the masthead */}
      <div className="border-b-2 border-stone-900 dark:border-stone-100" />
    </header>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-dotted border-stone-200 dark:border-stone-800 pb-2">
      <dt className="text-[11px] uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
        {label}
      </dt>
      <dd
        className={`${mono ? 'font-mono text-[13px]' : 'font-serif text-[18px]'} tabular-nums text-stone-900 dark:text-stone-50`}
      >
        {value}
      </dd>
    </div>
  );
}
