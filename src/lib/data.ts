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
    why_it_matters: string;
    relevance_score: number;
  }[];
  worth_noting: { arxiv_id: string; one_liner: string }[];
  paper_index: Record<string, PaperMeta>;
}

export interface PaperMeta {
  title: string;
  authors: string[];
  abs: string;
  categories: string[];
  summary?: string;
  date?: string;
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
  startup_thesis: string;
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

export async function listTrends(): Promise<string[]> {
  try {
    return parseList(await fetchText('/data/trends/trends-list.txt'));
  } catch (e) {
    if ((e as Error & { status?: number }).status === 404) return [];
    throw e;
  }
}

export async function loadTrends(file: string): Promise<TrendsReport> {
  return fetchJson<TrendsReport>(`/data/trends/${file}`);
}
