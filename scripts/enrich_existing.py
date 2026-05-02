"""One-shot: backfill citation counts into existing data/briefings/* and
data/trends/* so the new UI has something to render before the next
pipeline run. Idempotent (the citation cache and `if found` guards make
re-running cheap).

Usage:
    python3 scripts/enrich_existing.py
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline.citations import enrich_paper_index, fetch_citations


def enrich_trends(path: str) -> None:
    with open(path) as f:
        t = json.load(f)

    paper_index: dict = t.get("paper_index", {})
    clusters = t.get("clusters", [])

    # Collect ids that belong to any top cluster
    cluster_ids: set[str] = set()
    for c in clusters:
        cluster_ids.update(c.get("all_paper_ids") or [])

    target = {pid: paper_index[pid] for pid in cluster_ids if pid in paper_index}
    print(f"  trends {os.path.basename(path)}: enriching {len(target)} cluster papers")
    enrich_paper_index(target)

    # Compute seminal paper + density per cluster
    for c in clusters:
        ids = c.get("all_paper_ids") or []
        scored = []
        for pid in ids:
            meta = paper_index.get(pid) or {}
            cc = meta.get("citation_count")
            if cc is None:
                continue
            scored.append((cc, meta.get("influential_count", 0), pid))
        if not scored:
            continue
        scored.sort(reverse=True)
        top_cc, top_inf, top_pid = scored[0]
        if top_cc > 0:
            c["seminal_paper_id"] = top_pid
            c["seminal_citations"] = top_cc
            c["seminal_influential"] = top_inf
            # Make sure the seminal paper has full metadata
            meta = paper_index.get(top_pid) or {}
            if not meta.get("title"):
                # Pull from another cluster if it exists with full meta, else
                # fetch a minimal record from S2 (skipped — likely already a
                # long-tail member; UI shows the id which links to arXiv).
                pass
        counts = [cc for cc, _, _ in scored]
        c["citation_avg"] = round(sum(counts) / len(counts), 1)
        c["citation_max"] = max(counts)
        c["citation_coverage"] = round(len(scored) / max(len(ids), 1), 2)

    with open(path, "w") as f:
        json.dump(t, f, ensure_ascii=False, indent=2)
    print(f"  wrote {path}")


def enrich_briefing(path: str) -> None:
    with open(path) as f:
        b = json.load(f)
    paper_index = b.get("paper_index", {})
    if not paper_index:
        return
    print(f"  briefing {os.path.basename(path)}: enriching {len(paper_index)} papers")
    enrich_paper_index(paper_index)
    with open(path, "w") as f:
        json.dump(b, f, ensure_ascii=False, indent=2)
    print(f"  wrote {path}")


def main() -> None:
    import glob

    for p in sorted(glob.glob("data/trends/*.json")):
        if os.path.basename(p) == "latest.json":
            continue
        enrich_trends(p)

    for p in sorted(glob.glob("data/briefings/*.json")):
        if os.path.basename(p) == "latest.json":
            continue
        enrich_briefing(p)

    # Refresh latest.json mirrors
    for kind in ("trends", "briefings"):
        d = f"data/{kind}"
        files = sorted(
            f for f in os.listdir(d)
            if f.endswith(".json") and f != "latest.json"
        )
        if not files:
            continue
        latest = files[-1]
        with open(os.path.join(d, latest)) as src:
            data = src.read()
        with open(os.path.join(d, "latest.json"), "w") as dst:
            dst.write(data)
        print(f"  refreshed {kind}/latest.json -> {latest}")


if __name__ == "__main__":
    main()
