/**
 * 2D constellation of clusters — projects each cluster's high-dim centroid
 * onto the top two principal components and renders an SVG scatter where:
 *
 *   • position    = how semantically close clusters are (closer = more similar)
 *   • size (area) = how many papers the cluster contains
 *   • color       = status (new / growing / stable / shrinking)
 *
 * This is the "radar screen" view of the field for a given week. Clicking
 * a cluster scrolls to its detail card below.
 */
import { useMemo, useState } from 'react';
import { TrendCluster } from '../lib/data';
import { pca2D } from '../lib/pca';
import { slugifyLabel } from '../lib/data';

type Props = {
  clusters: TrendCluster[];
};

const STATUS_FILL: Record<string, string> = {
  new: 'fill-blue-500',
  growing: 'fill-amber-500',
  stable: 'fill-stone-400 dark:fill-stone-500',
  shrinking: 'fill-red-500',
};

const STATUS_STROKE: Record<string, string> = {
  new: 'stroke-blue-700 dark:stroke-blue-300',
  growing: 'stroke-amber-700 dark:stroke-amber-300',
  stable: 'stroke-stone-600 dark:stroke-stone-300',
  shrinking: 'stroke-red-700 dark:stroke-red-300',
};

const W = 880;
const H = 420;
const PAD = 60;

export function ConstellationMap({ clusters }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const { points, hasCentroids } = useMemo(() => {
    const withCentroids = clusters.filter((c) => Array.isArray(c.centroid) && c.centroid.length > 0);
    if (withCentroids.length < 2) {
      return { points: [], hasCentroids: false };
    }
    const matrix = withCentroids.map((c) => c.centroid as number[]);
    const { coords } = pca2D(matrix);

    // Map projected coords into the SVG viewport.
    const xs = coords.map(([x]) => x);
    const ys = coords.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const sizes = withCentroids.map((c) => c.size || 1);
    const maxSize = Math.max(...sizes);
    // Area-proportional radius. Largest cluster ≈ 28px; smallest floor at 6px.
    const rOf = (size: number) => Math.max(6, 28 * Math.sqrt(size / maxSize));

    const points = withCentroids.map((c, i) => {
      const [px, py] = coords[i];
      const x = PAD + ((px - minX) / rangeX) * (W - 2 * PAD);
      const y = PAD + ((py - minY) / rangeY) * (H - 2 * PAD);
      return {
        cluster: c,
        x,
        y,
        r: rOf(c.size || 1),
      };
    });
    // Render largest first so smaller dots sit on top and stay clickable.
    points.sort((a, b) => b.r - a.r);
    return { points, hasCentroids: true };
  }, [clusters]);

  if (!hasCentroids) return null;

  const handleClusterClick = (label: string) => {
    const id = `cluster-${slugifyLabel(label)}`;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hoveredPoint = hovered != null ? points.find((p) => p.cluster.cluster_id === hovered) : null;

  return (
    <section className="card !p-0 overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="h-section">Cluster constellation</h3>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-[42ch] text-right">
          PC₁ × PC₂ projection of cluster centroids · size = paper count · color = status
        </p>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block bg-stone-50/40 dark:bg-stone-950/40"
          role="img"
          aria-label="2D map of clusters"
        >
          {/* Subtle grid for spatial reference */}
          <defs>
            <pattern id="constellation-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" className="stroke-stone-200/50 dark:stroke-stone-800/50" fill="none" strokeWidth="1" />
            </pattern>
            <radialGradient id="constellation-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#constellation-grid)" />

          {/* Points */}
          {points.map(({ cluster, x, y, r }) => {
            const status = cluster.status || 'stable';
            const isHover = hovered === cluster.cluster_id;
            return (
              <g
                key={cluster.cluster_id}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(cluster.cluster_id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleClusterClick(cluster.label)}
                onFocus={() => setHovered(cluster.cluster_id)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="button"
                aria-label={`${cluster.label}, ${cluster.size} papers, ${status}`}
              >
                {isHover && (
                  <circle cx={x} cy={y} r={r * 2.2} className={STATUS_FILL[status] || STATUS_FILL.stable} opacity={0.18} />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  className={`${STATUS_FILL[status] || STATUS_FILL.stable} ${STATUS_STROKE[status] || STATUS_STROKE.stable} transition-all`}
                  strokeWidth={isHover ? 2.5 : 1}
                  fillOpacity={isHover ? 0.9 : 0.65}
                />
                {/* Inline label for big clusters so the chart reads at a glance */}
                {r >= 16 && (
                  <text
                    x={x}
                    y={y + r + 13}
                    textAnchor="middle"
                    className="fill-stone-700 dark:fill-stone-300 font-serif"
                    fontSize="11"
                    style={{ pointerEvents: 'none' }}
                  >
                    {cluster.label.length > 32 ? cluster.label.slice(0, 31) + '…' : cluster.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover detail card overlaid in the corner */}
        {hoveredPoint && (
          <div className="absolute top-3 left-3 max-w-[60%] sm:max-w-[40%] pointer-events-none">
            <div className="card !p-3 shadow-lg backdrop-blur-md">
              <p className="font-serif font-semibold text-[15px] leading-tight tracking-tight text-stone-900 dark:text-stone-50">
                {hoveredPoint.cluster.label}
              </p>
              <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <span className="font-mono tabular-nums">{hoveredPoint.cluster.size} papers</span>
                <span aria-hidden>·</span>
                <span className="uppercase tracking-[0.14em]">{hoveredPoint.cluster.status}</span>
                {typeof hoveredPoint.cluster.delta_pct === 'number' && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="font-mono tabular-nums">{hoveredPoint.cluster.delta_pct >= 0 ? '+' : ''}{hoveredPoint.cluster.delta_pct}%</span>
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-stone-200/70 dark:border-stone-800/70 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-stone-500 dark:text-stone-400">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />new</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />growing</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-400 dark:bg-stone-500" />stable</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />shrinking</span>
        <span className="hidden sm:inline ml-auto">click a dot to jump to its cluster</span>
      </div>
    </section>
  );
}
