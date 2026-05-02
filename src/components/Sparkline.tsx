/**
 * Tiny inline-SVG sparkline showing weekly paper counts for a cluster.
 * Computes bins client-side from the cluster's paper dates.
 */

export function Sparkline({
  paperDates,
  weeks = 12,
  width = 64,
  height = 18,
  className = '',
}: {
  paperDates: string[]; // YYYY-MM-DD
  weeks?: number;
  width?: number;
  height?: number;
  className?: string;
}) {
  const now = new Date();
  // Anchor to the most recent UTC midnight
  const anchor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const bins = new Array(weeks).fill(0);
  for (const ds of paperDates) {
    if (!ds) continue;
    const t = Date.parse(ds + 'T00:00:00Z');
    if (Number.isNaN(t)) continue;
    const weeksAgo = Math.floor((anchor - t) / weekMs);
    if (weeksAgo < 0 || weeksAgo >= weeks) continue;
    bins[weeks - 1 - weeksAgo] += 1;
  }

  const max = Math.max(1, ...bins);
  const padding = 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const barW = innerW / weeks;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-label={`Weekly paper count over ${weeks} weeks`}
    >
      {bins.map((v, i) => {
        const h = (v / max) * innerH;
        const x = padding + i * barW + 0.5;
        const y = padding + innerH - h;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={Math.max(0, barW - 1)}
            height={Math.max(1, h)}
            fill="currentColor"
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}
