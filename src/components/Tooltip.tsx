import { ReactNode, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Hover/focus-triggered tooltip rendered via a portal to document.body.
 * Portaling escapes parent `overflow-hidden` (top-pick cards, etc.) and
 * lets the tooltip auto-clamp to the viewport edge.
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
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLSpanElement | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  function show() {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    showTimer.current = window.setTimeout(() => setOpen(true), 180);
  }
  function hide() {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 80);
  }

  useEffect(() => {
    return () => {
      if (showTimer.current) window.clearTimeout(showTimer.current);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  // Position the tooltip relative to the trigger, clamped to viewport.
  // Runs synchronously after layout to avoid a flash at (0,0).
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tipRect = tipRef.current.getBoundingClientRect();
    const margin = 8;
    const gap = 6;

    let top: number;
    if (side === 'bottom') {
      top = triggerRect.bottom + gap;
    } else {
      top = triggerRect.top - tipRect.height - gap;
    }
    let left = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2;

    // Clamp to viewport
    const maxLeft = window.innerWidth - tipRect.width - margin;
    if (left < margin) left = margin;
    if (left > maxLeft) left = Math.max(margin, maxLeft);
    // If the tooltip would go off the top, flip to bottom
    if (top < margin) top = triggerRect.bottom + gap;

    setCoords({ top, left });
  }, [open, side, text]);

  return (
    <>
      <span
        ref={triggerRef}
        className="relative inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {open && typeof document !== 'undefined' &&
        createPortal(
          <span
            ref={tipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              visibility: coords ? 'visible' : 'hidden',
            }}
            className="z-[1000] pointer-events-none whitespace-normal w-max max-w-[min(20rem,calc(100vw-2rem))] px-2.5 py-1.5 rounded-md bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs shadow-lg leading-snug"
          >
            {text}
          </span>,
          document.body,
        )}
    </>
  );
}
