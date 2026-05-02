"""Weekly trend report: cluster the last 90 days of papers, rank clusters by
size × growth, ask the LLM for gap analysis on top clusters.

Reads:
    data/papers/*.jsonl       (raw papers)
    data/embeddings/*.jsonl   (vectors)
    data/trends/*.json        (previous reports, for week-over-week deltas)

Writes:
    data/trends/{date}.json
    data/trends/trends-list.txt
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import dotenv
import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer

from langchain_openai import ChatOpenAI
from langchain.prompts import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)

try:
    from pipeline.structures import TrendsReport
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from pipeline.structures import TrendsReport

if os.path.exists(".env"):
    dotenv.load_dotenv()

PROMPT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts")
SYSTEM_PROMPT = open(os.path.join(PROMPT_DIR, "trends_system.txt")).read()

USER_TEMPLATE = """Corpus window: last {window_days} days, {paper_count} papers, {cluster_count} clusters total.
Previous report: {prev_report_date}

Top {top_n} clusters by (size × growth), each tagged with week-over-week status:

{clusters}

{dropped_section}

Produce TrendsReport. Focus reasoning on NEW and GROWING clusters. Mention dropped ones in overview if material.
"""


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--papers-dir", default="data/papers")
    p.add_argument("--embeddings-dir", default="data/embeddings")
    p.add_argument("--out-dir", default="data/trends")
    p.add_argument("--window-days", type=int, default=90)
    p.add_argument("--n-clusters", type=int, default=20)
    p.add_argument("--top-n", type=int, default=10)
    p.add_argument("--report-date", default=None, help="YYYY-MM-DD; defaults to today UTC")
    return p.parse_args()


def date_from_filename(path: str) -> Optional[str]:
    m = re.search(r"(\d{4}-\d{2}-\d{2})", os.path.basename(path))
    return m.group(1) if m else None


def load_papers(papers_dir: str, window_days: int, end: datetime) -> Dict[str, dict]:
    cutoff = end - timedelta(days=window_days)
    by_id: Dict[str, dict] = {}
    for path in sorted(glob.glob(os.path.join(papers_dir, "*.jsonl"))):
        ds = date_from_filename(path)
        if not ds:
            continue
        try:
            d = datetime.strptime(ds, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if d < cutoff or d > end:
            continue
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    continue
                pid = item.get("id")
                if not pid:
                    continue
                item["_date"] = ds
                if pid not in by_id:
                    by_id[pid] = item
    return by_id


def load_embeddings(embeddings_dir: str, ids: set) -> Dict[str, np.ndarray]:
    by_id: Dict[str, np.ndarray] = {}
    for path in sorted(glob.glob(os.path.join(embeddings_dir, "*.jsonl"))):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                pid = rec.get("id")
                vec = rec.get("v")
                if pid in ids and vec:
                    by_id[pid] = np.asarray(vec, dtype=np.float32)
    return by_id


def cluster_kmeans(matrix: np.ndarray, k: int) -> np.ndarray:
    k = min(k, max(2, matrix.shape[0] // 5))
    return KMeans(n_clusters=k, random_state=42, n_init=10).fit_predict(matrix)


def cluster_keywords(corpus: List[str], labels: np.ndarray, top_k: int = 8) -> Dict[int, List[str]]:
    if not corpus:
        return {}
    try:
        vec = TfidfVectorizer(max_features=2000, stop_words="english", ngram_range=(1, 2), min_df=2)
        tfidf = vec.fit_transform(corpus)
    except ValueError:
        return {}
    feats = np.array(vec.get_feature_names_out())
    out: Dict[int, List[str]] = {}
    for cid in sorted({int(l) for l in labels}):
        mask = labels == cid
        if not mask.any():
            continue
        mean = np.asarray(tfidf[mask].mean(axis=0)).ravel()
        out[cid] = feats[mean.argsort()[::-1][:top_k]].tolist()
    return out


def growth_ratio(dates: List[str], end: datetime) -> float:
    recent_cut = end - timedelta(days=28)
    prior_cut = end - timedelta(days=84)
    recent = sum(1 for d in dates if datetime.strptime(d, "%Y-%m-%d").replace(tzinfo=timezone.utc) >= recent_cut)
    prior = sum(1 for d in dates if prior_cut <= datetime.strptime(d, "%Y-%m-%d").replace(tzinfo=timezone.utc) < recent_cut)
    return (recent + 1) / (max(prior, 1) / 2 + 1)


def build_summary(cid: int, ids: List[str], papers: Dict[str, dict], keywords: List[str], growth: float, centroid: np.ndarray, embeddings: Dict[str, np.ndarray], sample_n: int = 8) -> dict:
    sims: List[Tuple[float, str]] = []
    for pid in ids:
        v = embeddings.get(pid)
        if v is None:
            continue
        denom = (np.linalg.norm(v) * np.linalg.norm(centroid)) or 1.0
        sims.append((float(np.dot(v, centroid) / denom), pid))
    sims.sort(reverse=True)
    sample_ids = [pid for _, pid in sims[:sample_n]]

    blocks = []
    for pid in sample_ids:
        p = papers[pid]
        title = (p.get("title") or "").strip()
        abstract = (p.get("summary") or "").strip()
        if len(abstract) > 600:
            abstract = abstract[:600].rstrip() + "..."
        blocks.append(f"  - {pid} ({p.get('_date')}) {title}\n    {abstract}")

    return {
        "id": cid,
        "size": len(ids),
        "growth_ratio": round(growth, 2),
        "score": round(len(ids) * growth, 2),
        "keywords": keywords,
        "sample_paper_ids": sample_ids,
        "sample_blocks": blocks,
        "all_paper_ids": ids,
    }


def format_clusters_for_prompt(clusters: List[dict]) -> str:
    out = []
    for c in clusters:
        s = c.get("status_info") or {}
        status = (s.get("status") or "new").upper()
        delta = s.get("delta_pct")
        prev_label = s.get("matched_label")
        if status == "NEW":
            tag = "NEW (no analogue last week)"
        elif delta is not None:
            sign = "+" if delta >= 0 else ""
            prev_part = f', was: "{prev_label}"' if prev_label else ""
            tag = f"{status} ({sign}{delta}% papers since last week{prev_part})"
        else:
            tag = status
        out.append(
            f"Cluster {c['id']} [{tag}]\n"
            f"  size: {c['size']}    growth_ratio: {c['growth_ratio']}    score: {c['score']}\n"
            f"  keywords: {', '.join(c['keywords'])}\n"
            f"  representative papers:\n" + "\n".join(c["sample_blocks"])
        )
    return "\n\n".join(out)


def format_dropped(dropped: List[dict]) -> str:
    if not dropped:
        return ""
    lines = ["Clusters present last week with no clear analogue this week (DROPPED):"]
    for d in dropped[:8]:
        lines.append(f"  - \"{d.get('label') or '(unlabeled)'}\" (was {d.get('size', '?')} papers)")
    if len(dropped) > 8:
        lines.append(f"  - ...and {len(dropped) - 8} more")
    return "\n".join(lines)


def load_previous_report(out_dir: str, end: datetime) -> Optional[dict]:
    if not os.path.isdir(out_dir):
        return None
    candidates: List[Tuple[datetime, str]] = []
    for path in glob.glob(os.path.join(out_dir, "*.json")):
        m = re.search(r"(\d{4}-\d{2}-\d{2})\.json$", path)
        if not m:
            continue
        try:
            d = datetime.strptime(m.group(1), "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if d < end:
            candidates.append((d, path))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    try:
        with open(candidates[0][1]) as f:
            return json.load(f)
    except Exception as e:
        print(f"failed to load previous report: {e}", file=sys.stderr)
        return None


def match_clusters(current: List[dict], centroids: Dict[int, np.ndarray], previous: Optional[dict], threshold: float = 0.85) -> Tuple[Dict[int, dict], List[dict], Optional[str]]:
    statuses = {c["id"]: {"status": "new", "delta_pct": None, "matched_label": None} for c in current}
    if not previous:
        return statuses, [], None
    prev_clusters = [c for c in previous.get("clusters", []) if c.get("centroid")]
    if not prev_clusters or not current:
        return statuses, [], previous.get("report_date")

    cur_v = np.stack([centroids[c["id"]] for c in current])
    prev_v = np.stack([np.asarray(c["centroid"], dtype=np.float32) for c in prev_clusters])
    cur_n = cur_v / (np.linalg.norm(cur_v, axis=1, keepdims=True) + 1e-9)
    prev_n = prev_v / (np.linalg.norm(prev_v, axis=1, keepdims=True) + 1e-9)
    sim = cur_n @ prev_n.T

    pairs = [(float(sim[i, j]), i, j) for i in range(sim.shape[0]) for j in range(sim.shape[1])]
    pairs.sort(reverse=True)
    matched_cur: Dict[int, Tuple[int, float]] = {}
    matched_prev: set = set()
    for s, i, j in pairs:
        if s < threshold:
            break
        if i in matched_cur or j in matched_prev:
            continue
        matched_cur[i] = (j, s)
        matched_prev.add(j)

    for idx, c in enumerate(current):
        cid = c["id"]
        if idx not in matched_cur:
            statuses[cid] = {"status": "new", "delta_pct": None, "matched_label": None}
            continue
        j, s = matched_cur[idx]
        prev = prev_clusters[j]
        prev_size = prev.get("size") or 1
        ratio = c["size"] / prev_size
        delta = round((c["size"] - prev_size) / prev_size * 100, 1)
        if ratio >= 1.2:
            status = "growing"
        elif ratio <= 0.8:
            status = "shrinking"
        else:
            status = "stable"
        statuses[cid] = {"status": status, "delta_pct": delta, "matched_label": prev.get("label"), "match_similarity": round(s, 3)}

    dropped = [prev_clusters[j] for j in range(len(prev_clusters)) if j not in matched_prev]
    return statuses, dropped, previous.get("report_date")


def main() -> None:
    if not os.environ.get("OPENAI_BASE_URL", "").strip():
        os.environ.pop("OPENAI_BASE_URL", None)

    args = parse_args()
    model_name = os.environ.get("TRENDS_MODEL_NAME") or os.environ.get("MODEL_NAME", "gpt-5.4-mini")
    language = os.environ.get("LANGUAGE", "English")

    end = (
        datetime.strptime(args.report_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if args.report_date
        else datetime.now(timezone.utc)
    )
    end_str = end.strftime("%Y-%m-%d")

    papers = load_papers(args.papers_dir, args.window_days, end)
    if len(papers) < 50:
        print(f"only {len(papers)} papers in window — too few", file=sys.stderr)
        sys.exit(0)

    embeddings = load_embeddings(args.embeddings_dir, set(papers.keys()))
    aligned = [pid for pid in papers if pid in embeddings]
    if len(aligned) < 50:
        print(f"only {len(aligned)} papers have embeddings", file=sys.stderr)
        sys.exit(0)

    print(f"Clustering {len(aligned)} papers ending {end_str}", file=sys.stderr)
    matrix = np.stack([embeddings[pid] for pid in aligned])
    matrix = matrix / (np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-9)
    labels = cluster_kmeans(matrix, args.n_clusters)

    corpus_texts = []
    for pid in aligned:
        p = papers[pid]
        corpus_texts.append(f"{p.get('title', '')} {p.get('summary', '')}")
    keywords = cluster_keywords(corpus_texts, labels)

    cluster_to_papers: Dict[int, List[str]] = defaultdict(list)
    for pid, lbl in zip(aligned, labels):
        cluster_to_papers[int(lbl)].append(pid)

    centroids: Dict[int, np.ndarray] = {}
    for cid, ids in cluster_to_papers.items():
        idxs = [aligned.index(pid) for pid in ids]
        centroids[cid] = matrix[idxs].mean(axis=0)

    summaries: List[dict] = []
    for cid, ids in cluster_to_papers.items():
        if len(ids) < 5:
            continue
        dates = [papers[pid]["_date"] for pid in ids]
        g = growth_ratio(dates, end)
        summaries.append(build_summary(cid, ids, papers, keywords.get(cid, []), g, centroids[cid], embeddings))

    summaries.sort(key=lambda c: c["score"], reverse=True)
    top = summaries[:args.top_n]

    previous = load_previous_report(args.out_dir, end)
    statuses, dropped, prev_date = match_clusters(top, centroids, previous)
    for c in top:
        c["status_info"] = statuses.get(c["id"], {"status": "new"})

    print(f"Asking {model_name} to analyze {len(top)} clusters (prev: {prev_date or 'none'}; dropped: {len(dropped)})", file=sys.stderr)
    llm = ChatOpenAI(model=model_name).with_structured_output(TrendsReport, method="function_calling")
    prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT),
        HumanMessagePromptTemplate.from_template(USER_TEMPLATE),
    ])
    chain = prompt | llm

    report: TrendsReport = chain.invoke({
        "language": language,
        "window_days": args.window_days,
        "paper_count": len(aligned),
        "cluster_count": len(summaries),
        "top_n": len(top),
        "clusters": format_clusters_for_prompt(top),
        "dropped_section": format_dropped(dropped),
        "prev_report_date": prev_date or "(no previous report — first run)",
    })

    cluster_lookup = {c["id"]: c for c in top}
    out_clusters = []
    for analysis in report.top_clusters:
        c = cluster_lookup.get(analysis.cluster_id)
        if not c:
            continue
        s = c.get("status_info") or {}
        out_clusters.append({
            **analysis.model_dump(),
            "size": c["size"],
            "growth_ratio": c["growth_ratio"],
            "score": c["score"],
            "keywords": c["keywords"],
            "sample_paper_ids": c["sample_paper_ids"],
            "all_paper_ids": c["all_paper_ids"],
            "status": s.get("status", "new"),
            "delta_pct": s.get("delta_pct"),
            "matched_prev_label": s.get("matched_label"),
            "centroid": [round(float(x), 4) for x in centroids[c["id"]].tolist()],
        })

    paper_index = {
        pid: {
            "title": (papers[pid].get("title") or "").strip(),
            "authors": papers[pid].get("authors", []),
            "abs": papers[pid].get("abs") or f"https://arxiv.org/abs/{pid}",
            "date": papers[pid].get("_date"),
            "categories": papers[pid].get("categories", []),
        }
        for pid in aligned
    }

    output = {
        "report_date": end_str,
        "previous_report_date": prev_date,
        "window_days": args.window_days,
        "paper_count": len(aligned),
        "cluster_count": len(summaries),
        "language": language,
        "model": model_name,
        "overview": report.overview,
        "clusters": out_clusters,
        "dropped_clusters": [{"label": d.get("label"), "size": d.get("size"), "one_line": d.get("one_line")} for d in dropped],
        "paper_index": paper_index,
    }

    os.makedirs(args.out_dir, exist_ok=True)
    out_path = os.path.join(args.out_dir, f"{end_str}.json")
    with open(out_path, "w") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out_path}", file=sys.stderr)

    list_path = os.path.join(args.out_dir, "trends-list.txt")
    files = sorted(os.path.basename(p) for p in glob.glob(os.path.join(args.out_dir, "*.json")))
    with open(list_path, "w") as f:
        for n in files:
            f.write(n + "\n")


if __name__ == "__main__":
    main()
