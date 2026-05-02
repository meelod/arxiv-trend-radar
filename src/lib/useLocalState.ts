import { useEffect, useState } from 'react';
import { subscribe } from './state';

/**
 * Re-render a component whenever localStorage state changes (within this tab).
 * Returns a counter that increments on every change — components can use the
 * counter as a dep to recompute derived values, or just use it for re-renders.
 */
export function useStateVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const unsub = subscribe(() => setV((x) => x + 1));
    return () => {
      unsub();
    };
  }, []);
  return v;
}
