// All data lives at /data/ on the same origin (Vercel serves it from main).

export interface Briefing {
  date: string;
  paper_count: number;
  model: string;
  language: string;
  headline: string;
  executive_overview: string;
  themes: { name: string; summary: string; paper_ids: string[] }[];
  top_picks: {
    arxiv_id: string;
    title: string;
    plain_english?: string;
    why_it_matters: string;
    relevance_score: number;
  }[];
  worth_noting: { arxiv_id: string; one_liner: string }[];
  paper_index: Record<string, PaperMeta>;
}

export interface PaperMeta {
  // title / abs / categories are present for sample papers and the daily
  // briefing's referenced papers. The trends report's long-tail papers
  // (used only for sparklines + author rollups) only carry date + authors.
  title?: string;
  abs?: string;
  categories?: string[];
  authors?: string[];
  summary?: string;
  date?: string;
  citation_count?: number;
  influential_count?: number;
  primary_affiliation?: string;
  s2_authors?: { id: string | null; name: string; aff: string | null }[];
}

export interface MacroPattern {
  name: string;
  summary: string;
  so_what?: string;
  cluster_ids: number[];
}

export interface TrendsReport {
  report_date: string;
  previous_report_date: string | null;
  window_days: number;
  paper_count: number;
  cluster_count: number;
  language: string;
  model: string;
  overview: string;
  macro_patterns?: MacroPattern[];
  clusters: TrendCluster[];
  dropped_clusters: { label: string; size: number; one_line?: string }[];
  paper_index: Record<string, PaperMeta>;
}

export interface Company {
  name: string;
  what_they_do: string;
  stage: string;
  why_relevant: string;
}

export interface TrendCluster {
  cluster_id: number;
  label: string;
  one_line: string;
  existing_companies?: Company[];
  existing_landscape: string;
  research_industry_gap: string;
  startup_thesis?: string;
  why_now: string;
  risks: string;
  confidence: string;
  size: number;
  growth_ratio: number;
  score: number;
  keywords: string[];
  sample_paper_ids: string[];
  all_paper_ids: string[];
  status: 'new' | 'growing' | 'stable' | 'shrinking';
  delta_pct: number | null;
  matched_prev_label: string | null;
  centroid?: number[];
  seminal_paper_id?: string;
  seminal_citations?: number;
  seminal_influential?: number;
  citation_avg?: number;
  citation_max?: number;
  citation_coverage?: number;
}

/**
 * Slugify a cluster label for use in URLs.
 * "MoE Inference Acceleration" -> "moe-inference-acceleration"
 */
export function slugifyLabel(label: string): string {
  return (label || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'cluster';
}

// The trends LLM occasionally references clusters in prose by raw ID
// ("Cluster 17 and Cluster 18 both..."), but those numeric IDs aren't shown
// anywhere on the page. Rewrite "Cluster N" to the cluster's label when known.
// When the cluster ID isn't in the active set (e.g. a shrinking cluster the
// LLM saw in its input but didn't surface in the output), strip the
// parenthetical "(Cluster N)" entirely — the surrounding prose already names
// the concept, so the orphaned ID is just noise. Used by overview,
// macro_pattern.summary, and macro_pattern.so_what — applied at render time
// so older reports also benefit.
export function humanizeClusterRefs(
  text: string,
  clusters: { cluster_id: number; label: string }[],
): string {
  const byId = new Map(clusters.map((c) => [c.cluster_id, c.label]));
  return text
    // First, strip orphan parentheticals: " (Cluster N)" where N is unknown.
    .replace(/\s*\(Cluster\s+(\d+)\)/g, (match, idStr) => {
      return byId.has(Number(idStr)) ? match : '';
    })
    // Then, swap any remaining "Cluster N" references with the label.
    .replace(/\bCluster\s+(\d+)\b/g, (match, idStr) => {
      const label = byId.get(Number(idStr));
      return label ? `"${label}"` : match;
    });
}

async function fetchText(path: string): Promise<string> {
  const r = await fetch(path, { cache: 'no-store' });
  if (r.status === 404) {
    const err = new Error(`${path} → 404`);
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.text();
}

async function fetchJson<T>(path: string): Promise<T> {
  const r = await fetch(path, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

// Optimistic fetch — returns the response if it 200s, null on 404.
// Used for /data/{briefings,trends}/latest.json which may not exist yet.
async function fetchJsonIfExists<T>(path: string): Promise<T | null> {
  const r = await fetch(path);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

function parseList(txt: string): string[] {
  return txt
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.endsWith('.json'))
    .sort()
    .reverse();
}

export async function listBriefings(): Promise<string[]> {
  try {
    return parseList(await fetchText('/data/briefings/briefings-list.txt'));
  } catch (e) {
    // 404 → treat as empty state (no briefings generated yet)
    if ((e as Error & { status?: number }).status === 404) return [];
    throw e;
  }
}

export async function loadBriefing(file: string): Promise<Briefing> {
  return fetchJson<Briefing>(`/data/briefings/${file}`);
}

export async function loadLatestBriefing(): Promise<Briefing | null> {
  return fetchJsonIfExists<Briefing>('/data/briefings/latest.json');
}

export async function listTrends(): Promise<string[]> {
  try {
    return parseList(await fetchText('/data/trends/trends-list.txt'));
  } catch (e) {
    if ((e as Error & { status?: number }).status === 404) return [];
    throw e;
  }
}

// Trend reports are immutable once produced (the file at /data/trends/{date}.json
// never changes), so cache them in-memory to avoid re-downloading the ~20MB
// payload when the user clicks between dates.
const trendsCache = new Map<string, TrendsReport>();

export async function loadTrends(file: string): Promise<TrendsReport> {
  const cached = trendsCache.get(file);
  if (cached) return cached;
  const r = await fetch(`/data/trends/${file}`);
  if (!r.ok) throw new Error(`/data/trends/${file} → ${r.status}`);
  const report = (await r.json()) as TrendsReport;
  trendsCache.set(file, report);
  return report;
}

export async function loadLatestTrends(): Promise<TrendsReport | null> {
  return fetchJsonIfExists<TrendsReport>('/data/trends/latest.json');
}

// Raw arXiv papers as fetched by the daily pipeline — every paper for the
// day, before any LLM filtering. Used by the Daily page's "All papers"
// section so users can browse the full feed without LLM mediation.
export interface RawPaper {
  id: string;
  title: string;
  authors: string[];
  summary?: string;
  categories: string[];
  abs?: string;
  pdf?: string;
  published?: string;
  updated?: string;
  comment?: string;
}

export async function loadRawPapers(date: string): Promise<RawPaper[]> {
  const text = await fetchText(`/data/papers/${date}.jsonl`);
  const out: RawPaper[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines silently; pipeline writes valid JSONL but
      // partial-write recovery in CI can occasionally leave ragged tails.
    }
  }
  return out;
}
