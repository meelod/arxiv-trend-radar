"""Citation-count enrichment via Semantic Scholar's batch endpoint.

Used as a signal — not a graph. We don't visualize the citation network
(Connected Papers already does that well). Instead, we use citation counts
to:
  - Mark high-impact papers in the daily briefing ("seminal" badge)
  - Surface the most-cited paper per cluster as the cluster's anchor paper
  - Compute "citation density" per cluster (mature vs. nascent fields)

Semantic Scholar's batch endpoint accepts up to 500 ids per call:
    POST https://api.semanticscholar.org/graph/v1/paper/batch
        ?fields=citationCount,influentialCitationCount
    body: {"ids": ["arXiv:2604.27689", ...]}

Free tier is ~1 req/sec without an API key. We cache results on disk and
re-fetch entries older than CACHE_TTL_DAYS so citation counts stay fresh
as papers age in.
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional

import requests

CACHE_PATH_DEFAULT = "data/citations/cache.json"
BATCH_SIZE = 400  # Semantic Scholar allows 500 but we leave headroom
CACHE_TTL_DAYS = 7  # re-fetch entries older than this
REQUEST_TIMEOUT = 30
SLEEP_BETWEEN = 1.0  # 1 req/sec is safe without an API key
MAX_RETRIES = 3

API_URL = "https://api.semanticscholar.org/graph/v1/paper/batch"


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _is_stale(fetched: Optional[str]) -> bool:
    if not fetched:
        return True
    try:
        d = datetime.strptime(fetched, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        return True
    return (datetime.now(timezone.utc) - d) > timedelta(days=CACHE_TTL_DAYS)


def load_cache(path: str = CACHE_PATH_DEFAULT) -> Dict[str, dict]:
    if not os.path.exists(path):
        return {}
    try:
        with open(path) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_cache(cache: Dict[str, dict], path: str = CACHE_PATH_DEFAULT) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(cache, f, ensure_ascii=False, indent=0, sort_keys=True)
    os.replace(tmp, path)


def _fetch_batch(arxiv_ids: List[str], api_key: Optional[str]) -> List[Optional[dict]]:
    """Call the batch endpoint for one chunk of ids."""
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["x-api-key"] = api_key
    body = {"ids": [f"ARXIV:{pid}" for pid in arxiv_ids]}
    params = {"fields": "citationCount,influentialCitationCount"}

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.post(
                API_URL, params=params, json=body, headers=headers, timeout=REQUEST_TIMEOUT
            )
        except requests.RequestException as e:
            print(f"  citations: request error (attempt {attempt}): {e}", file=sys.stderr)
            time.sleep(2 * attempt)
            continue

        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list):
                return data
            print(f"  citations: unexpected response shape {type(data).__name__}", file=sys.stderr)
            return [None] * len(arxiv_ids)

        if r.status_code in (429, 502, 503, 504):
            wait = 5 * attempt
            print(f"  citations: HTTP {r.status_code}, backing off {wait}s", file=sys.stderr)
            time.sleep(wait)
            continue

        # 4xx other than 429 — bad request, log and skip
        print(f"  citations: HTTP {r.status_code} {r.text[:200]}", file=sys.stderr)
        return [None] * len(arxiv_ids)

    return [None] * len(arxiv_ids)


def fetch_citations(
    arxiv_ids: Iterable[str],
    cache_path: str = CACHE_PATH_DEFAULT,
) -> Dict[str, dict]:
    """Return {arxiv_id: {citation_count, influential_count, fetched}} for the given ids.

    Reads from on-disk cache where fresh, fetches missing/stale entries from
    Semantic Scholar in batches, writes the cache back, and returns the merged
    map. Failures fall back to whatever is in cache (or empty dict for that id).
    """
    ids = sorted({pid for pid in arxiv_ids if pid})
    if not ids:
        return {}

    cache = load_cache(cache_path)
    today = _today()

    to_fetch = [pid for pid in ids if _is_stale(cache.get(pid, {}).get("fetched"))]
    if not to_fetch:
        return {pid: cache[pid] for pid in ids if pid in cache}

    api_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY", "").strip() or None
    print(
        f"  citations: {len(to_fetch)}/{len(ids)} need fetching"
        + (" (with api key)" if api_key else " (anonymous)"),
        file=sys.stderr,
    )

    fetched_count = 0
    null_count = 0
    for start in range(0, len(to_fetch), BATCH_SIZE):
        chunk = to_fetch[start : start + BATCH_SIZE]
        results = _fetch_batch(chunk, api_key)
        for pid, rec in zip(chunk, results):
            if rec is None:
                # Paper not indexed by Semantic Scholar — record a 0 with today's date
                # so we don't re-hammer the API for it every run.
                cache[pid] = {"citation_count": 0, "influential_count": 0, "fetched": today, "found": False}
                null_count += 1
            else:
                cache[pid] = {
                    "citation_count": int(rec.get("citationCount") or 0),
                    "influential_count": int(rec.get("influentialCitationCount") or 0),
                    "fetched": today,
                    "found": True,
                }
                fetched_count += 1
        time.sleep(SLEEP_BETWEEN)

    save_cache(cache, cache_path)
    print(f"  citations: fetched {fetched_count} found, {null_count} not in S2", file=sys.stderr)

    return {pid: cache[pid] for pid in ids if pid in cache}


def enrich_paper_index(
    paper_index: Dict[str, dict],
    cache_path: str = CACHE_PATH_DEFAULT,
) -> None:
    """Mutate paper_index in place: add citation_count and influential_count
    to every entry that has a Semantic Scholar match. Missing/failed entries
    are left untouched (UI treats absence as 'unknown')."""
    citations = fetch_citations(paper_index.keys(), cache_path=cache_path)
    for pid, rec in citations.items():
        meta = paper_index.get(pid)
        if not meta:
            continue
        if not rec.get("found"):
            continue
        meta["citation_count"] = rec["citation_count"]
        meta["influential_count"] = rec["influential_count"]


if __name__ == "__main__":
    # Smoke test: fetch a couple of well-known arxiv ids.
    test_ids = ["1706.03762", "2005.14165"]  # Attention Is All You Need; GPT-3
    out = fetch_citations(test_ids, cache_path="data/citations/cache.json")
    for pid, rec in out.items():
        print(f"{pid}: {rec}")
