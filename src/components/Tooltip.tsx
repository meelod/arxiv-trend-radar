import { ReactNode, useState, useRef, useEffect } from 'react';

/**
 * Lightweight tooltip — pure CSS positioning + React state.
 * No deps, no portals, ~50 lines. Hover or focus the wrapped child to show.
 *
 * Usage:
 *   <Tooltip text="papers per week, last 12 weeks">
 *     <Sparkline ... />
 *   </Tooltip>
 */
export function Tooltip({
  text,
  children,
  side = 'top',
}: {
  text: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  function show() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 180);
  }
  function hide() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 80);
  }

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const placement =
    side === 'bottom'
      ? 'top-full mt-1.5'
      : 'bottom-full mb-1.5';

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={`absolute left-1/2 -translate-x-1/2 ${placement} z-50 pointer-events-none whitespace-normal w-max max-w-[min(20rem,calc(100vw-2rem))] px-2.5 py-1.5 rounded-md bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs shadow-lg leading-snug`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
