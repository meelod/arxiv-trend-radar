/**
 * Tiny PCA for projecting cluster centroids (N rows × D cols, N << D).
 *
 * Strategy: build the Gram matrix G = X_c · X_cᵀ (N×N, cheap when N≈20)
 * and recover the top-2 principal-component projections from its top
 * eigenpairs via power iteration. For a high-D, low-N case this is the
 * efficient and numerically reasonable route — no SVD library needed.
 */

export interface PCAResult {
  coords: Array<[number, number]>;     // one [x, y] per input row
  explained: [number, number];          // raw eigenvalues (relative magnitudes)
}

function powerIterate(M: number[][], n: number, iters: number): { vec: number[]; val: number } {
  // Deterministic seed so the layout doesn't jiggle across renders.
  let v = new Array(n).fill(0).map((_, i) => Math.sin(i + 1) + Math.cos(i * 1.7));
  let norm = Math.hypot(...v);
  for (let i = 0; i < n; i++) v[i] /= norm;

  for (let it = 0; it < iters; it++) {
    const next = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      const Mi = M[i];
      for (let k = 0; k < n; k++) s += Mi[k] * v[k];
      next[i] = s;
    }
    norm = Math.hypot(...next);
    if (norm < 1e-12) break;
    for (let i = 0; i < n; i++) next[i] /= norm;
    v = next;
  }
  // Rayleigh quotient → eigenvalue
  let val = 0;
  for (let i = 0; i < n; i++) {
    let s = 0;
    const Mi = M[i];
    for (let k = 0; k < n; k++) s += Mi[k] * v[k];
    val += v[i] * s;
  }
  return { vec: v, val };
}

export function pca2D(rows: number[][]): PCAResult {
  const N = rows.length;
  if (N === 0) return { coords: [], explained: [0, 0] };
  const D = rows[0].length;
  if (D === 0 || N === 1) {
    return { coords: rows.map(() => [0, 0]), explained: [0, 0] };
  }

  // 1. Column means
  const means = new Array(D).fill(0);
  for (const r of rows) for (let j = 0; j < D; j++) means[j] += r[j];
  for (let j = 0; j < D; j++) means[j] /= N;

  // 2. Centered matrix (kept as flat row-major arrays for cache friendliness)
  const X = rows.map((r) => {
    const out = new Array(D);
    for (let j = 0; j < D; j++) out[j] = r[j] - means[j];
    return out;
  });

  // 3. Gram matrix G = X · X^T  (N × N)
  const G: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let k = i; k < N; k++) {
      let s = 0;
      const Xi = X[i];
      const Xk = X[k];
      for (let j = 0; j < D; j++) s += Xi[j] * Xk[j];
      G[i][k] = s;
      G[k][i] = s;
    }
  }

  // 4. Top eigenvector via power iteration
  const { vec: u1, val: l1 } = powerIterate(G, N, 80);
  // Deflate G' = G - λ₁ u₁ u₁ᵀ to expose the second eigenvector
  const Gp: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < N; k++) {
      Gp[i][k] = G[i][k] - l1 * u1[i] * u1[k];
    }
  }
  const { vec: u2, val: l2 } = powerIterate(Gp, N, 80);

  // Coordinates: row i lands at (√λ₁ · u₁[i], √λ₂ · u₂[i])
  const s1 = Math.sqrt(Math.max(l1, 0));
  const s2 = Math.sqrt(Math.max(l2, 0));
  const coords: Array<[number, number]> = [];
  for (let i = 0; i < N; i++) coords.push([u1[i] * s1, u2[i] * s2]);
  return { coords, explained: [l1, l2] };
}
