"""One-shot: validate and repair arxiv_ids in existing daily briefings.

The LLM occasionally hallucinates or transposes IDs in structured output —
returns the right title with a slightly wrong digit, so the link points to
a different paper. This walks every briefing JSON, locates its source
papers JSONL by date, and patches IDs (or drops entries) where the LLM
emitted something not in the input set.

Usage:
    python3 scripts/fix_briefing_ids.py
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _normalize_title(t: str) -> str:
    return re.sub(r"\s+", " ", (t or "").strip().lower()).rstrip(".,:;")


def _find_real_paper(arxiv_id: str, claimed_title: str, by_id: dict, by_norm_title: dict):
    from difflib import get_close_matches

    norm_claimed = _normalize_title(claimed_title)
    p = by_id.get(arxiv_id)
    if p is not None:
        norm_real = _normalize_title(p.get("title") or "")
        if not norm_claimed or norm_real[:50] == norm_claimed[:50]:
            return p
    if not norm_claimed:
        return None
    matches = get_close_matches(norm_claimed, list(by_norm_title.keys()), n=1, cutoff=0.85)
    if matches:
        return by_norm_title[matches[0]]
    return None


def find_source_papers(briefing_date: str) -> list[dict]:
    """Try briefing_date, then date-1, then date+1 to locate source papers.

    Daily workflow names briefings after either the source-papers date or
    the workflow run date depending on edge cases — auto-locate by overlap.
    """
    base = "data/papers"
    target = datetime.strptime(briefing_date, "%Y-%m-%d")
    candidates = [
        target.strftime("%Y-%m-%d"),
        (target - timedelta(days=1)).strftime("%Y-%m-%d"),
        (target + timedelta(days=1)).strftime("%Y-%m-%d"),
    ]
    for d in candidates:
        path = f"{base}/{d}.jsonl"
        if os.path.exists(path):
            with open(path) as f:
                papers = []
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        papers.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
            if papers:
                return papers
    return []


def fix_briefing(path: str) -> tuple[int, int, int, int]:
    """Returns (patched_picks, dropped_picks, dropped_wn, dropped_theme_ids)."""
    with open(path) as f:
        b = json.load(f)

    source_papers = find_source_papers(b["date"])
    if not source_papers:
        print(f"  {path}: no source papers found, skipping", file=sys.stderr)
        return (0, 0, 0, 0)

    by_id = {p["id"]: p for p in source_papers if p.get("id")}
    by_norm_title = {
        _normalize_title(p.get("title") or ""): p for p in source_papers if p.get("title")
    }

    fixed_picks = []
    patched = 0
    dropped = 0
    for pick in b.get("top_picks", []):
        real = _find_real_paper(pick.get("arxiv_id", ""), pick.get("title", ""), by_id, by_norm_title)
        if real is None:
            dropped += 1
            continue
        if real["id"] != pick.get("arxiv_id"):
            patched += 1
            pick["arxiv_id"] = real["id"]
        pick["title"] = (real.get("title") or pick.get("title") or "").strip()
        fixed_picks.append(pick)
    b["top_picks"] = fixed_picks

    # Worth-noting has only id + one_liner (no title for fuzzy match).
    fixed_wn = []
    dropped_wn = 0
    for wn in b.get("worth_noting", []):
        if wn.get("arxiv_id") in by_id:
            fixed_wn.append(wn)
        else:
            dropped_wn += 1
    b["worth_noting"] = fixed_wn

    dropped_theme_ids = 0
    for theme in b.get("themes", []):
        kept = []
        for pid in theme.get("paper_ids") or []:
            if pid in by_id:
                kept.append(pid)
            else:
                dropped_theme_ids += 1
        theme["paper_ids"] = kept

    # Rebuild paper_index strictly from referenced ids, sourced from real input papers.
    referenced: set[str] = set()
    for t in b.get("themes", []):
        referenced.update(t.get("paper_ids") or [])
    for p in b.get("top_picks", []):
        if p.get("arxiv_id"):
            referenced.add(p["arxiv_id"])
    for w in b.get("worth_noting", []):
        if w.get("arxiv_id"):
            referenced.add(w["arxiv_id"])

    new_index: dict = {}
    existing = b.get("paper_index", {}) or {}
    for pid in referenced:
        src = by_id.get(pid)
        prior = existing.get(pid, {})
        if src:
            new_index[pid] = {
                "title": (src.get("title") or "").strip(),
                "authors": src.get("authors", []),
                "abs": src.get("abs") or f"https://arxiv.org/abs/{pid}",
                "categories": src.get("categories", []),
                # Preserve any citation fields prior enrichment added.
                **{k: prior[k] for k in ("citation_count", "influential_count") if k in prior},
            }
    b["paper_index"] = new_index

    if patched or dropped or dropped_wn or dropped_theme_ids:
        with open(path, "w") as f:
            json.dump(b, f, ensure_ascii=False, indent=2)
        print(
            f"  {os.path.basename(path)}: patched {patched} pick ids, "
            f"dropped {dropped} picks / {dropped_wn} worth_noting / "
            f"{dropped_theme_ids} theme ids"
        )
    else:
        print(f"  {os.path.basename(path)}: clean")

    return (patched, dropped, dropped_wn, dropped_theme_ids)


def main() -> None:
    briefings = sorted(glob.glob("data/briefings/*.json"))
    briefings = [b for b in briefings if os.path.basename(b) != "latest.json"]

    totals = [0, 0, 0, 0]
    for path in briefings:
        result = fix_briefing(path)
        totals = [a + b for a, b in zip(totals, result)]

    # Refresh latest.json mirror.
    if briefings:
        latest_src = briefings[-1]
        with open(latest_src) as src:
            data = src.read()
        with open("data/briefings/latest.json", "w") as dst:
            dst.write(data)
        print(f"  refreshed latest.json -> {os.path.basename(latest_src)}")

    print(
        f"\nTotals: patched {totals[0]} picks, dropped {totals[1]} picks / "
        f"{totals[2]} worth_noting / {totals[3]} theme ids"
    )


if __name__ == "__main__":
    main()
