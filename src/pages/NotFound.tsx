import { Link, useLocation } from 'react-router-dom';

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="space-y-8 py-16 max-w-[60ch]">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="h-display text-[64px] sm:text-[80px] mt-3">
          Off the radar.
        </h1>
      </div>
      <p className="text-stone-600 dark:text-stone-300 leading-[1.7] text-[16px]">
        The page <code className="font-mono text-[14px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200">{pathname}</code>{' '}
        doesn&rsquo;t exist. It may have moved, or the link may have been generated
        before the underlying report rotated out of the 90-day window.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px] pt-2">
        <Link to="/" className="text-accent-500 hover:underline">Today&rsquo;s briefing &rarr;</Link>
        <Link to="/trends" className="text-accent-500 hover:underline">Latest trends &rarr;</Link>
        <Link to="/info" className="text-stone-500 dark:text-stone-400 hover:underline">About this site</Link>
      </div>
    </div>
  );
}
