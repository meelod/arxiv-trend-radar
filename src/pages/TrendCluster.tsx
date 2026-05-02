import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TrendsReport, TrendCluster as TrendClusterType, loadTrends, slugifyLabel } from '../lib/data';
import { ClusterCard } from '../components/ClusterCard';

export default function TrendCluster() {
  const { date, slug } = useParams<{ date: string; slug: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<TrendsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!date) return;
    loadTrends(`${date}.json`)
      .then(setReport)
      .catch((e) => setError(`Failed to load report ${date}: ${e.message}`));
  }, [date]);

  // Set the document title and meta description for the cluster
  useEffect(() => {
    if (!report || !slug) return;
    const cluster = findCluster(report, slug);
    if (cluster) {
      document.title = `${cluster.label} — arxiv-trend-radar`;
      setMeta('description', cluster.one_line);
      setMeta('og:title', cluster.label, true);
      setMeta('og:description', cluster.one_line, true);
      setMeta('twitter:title', cluster.label, true);
      setMeta('twitter:description', cluster.one_line, true);
    }
    return () => {
      document.title = 'arxiv-trend-radar';
    };
  }, [report, slug]);

  if (error) {
    return <div className="card border-red-200 bg-red-50 text-red-800">{error}</div>;
  }
  if (!report) {
    return <div className="text-stone-500 dark:text-stone-400">Loading…</div>;
  }

  const cluster = slug ? findCluster(report, slug) : null;
  if (!cluster) {
    return (
      <div className="card text-center text-stone-500 dark:text-stone-400 py-12">
        <p className="font-semibold mb-2">Cluster not found.</p>
        <p className="text-sm mb-4">No cluster matching "{slug}" in the {date} report.</p>
        <button
          onClick={() => navigate('/trends')}
          className="text-accent-500 hover:underline text-sm"
        >
          Back to trends
        </button>
      </div>
    );
  }

  const permalink = window.location.href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(permalink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: select the text
    }
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-3 text-sm text-stone-500 dark:text-stone-400 mb-2">
          <Link to="/trends" className="hover:underline">Trends</Link>
          <span>›</span>
          <span>{date}</span>
        </div>
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold">Trend cluster</p>
            <h1 className="text-2xl font-semibold mt-1">{cluster.label}</h1>
          </div>
          <button
            onClick={copyLink}
            className="text-sm px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Copy permalink"
          >
            {copied ? '✓ Copied' : '🔗 Copy link'}
          </button>
        </div>
      </div>

      <ClusterCard cluster={cluster} paperIndex={report.paper_index} />

      <div className="text-xs text-stone-500 dark:text-stone-400">
        Part of the <Link to="/trends" className="text-accent-500 hover:underline">{date} weekly report</Link>.
        {report.previous_report_date && (
          <span> Previous: {report.previous_report_date}.</span>
        )}
      </div>
    </div>
  );
}

function findCluster(report: TrendsReport, slug: string): TrendClusterType | null {
  return report.clusters.find((c) => slugifyLabel(c.label) === slug) || null;
}

function setMeta(name: string, content: string, isProperty = false) {
  if (typeof document === 'undefined') return;
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}
