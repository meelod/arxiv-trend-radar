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
    # `authors.authorId` is the canonical disambiguator for homonyms (multiple
    # researchers sharing a name); `authors.affiliations` gives an institution
    # tag per-paper. Both are best-effort — S2 coverage is partial.
    params = {
        "fields": "citationCount,influentialCitationCount,authors.authorId,authors.name,authors.affiliations"
    }

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

    # Re-fetch when stale by date OR when the cache entry predates the
    # author/affiliation schema (no `authors` key).
    def _needs_fetch(pid: str) -> bool:
        rec = cache.get(pid)
        if rec is None:
            return True
        if _is_stale(rec.get("fetched")):
            return True
        # Schema upgrade: pre-affiliation entries lack `authors`. Force refetch
        # for `found: true` rows so we pick up author data; leave `found: false`
        # rows alone — those papers aren't in S2 and a re-fetch won't help.
        if rec.get("found") and "authors" not in rec:
            return True
        return False

    to_fetch = [pid for pid in ids if _needs_fetch(pid)]
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
                cache[pid] = {
                    "citation_count": 0,
                    "influential_count": 0,
                    "fetched": today,
                    "found": False,
                    "authors": [],
                }
                null_count += 1
            else:
                # Compact author records: keep id + name + first non-empty affiliation
                # only. Some entries have many fragmentary affiliations; one is enough
                # for the UI tag and saves cache space.
                authors_raw = rec.get("authors") or []
                authors_compact = []
                for a in authors_raw:
                    if not isinstance(a, dict):
                        continue
                    name = (a.get("name") or "").strip()
                    if not name:
                        continue
                    affs = a.get("affiliations") or []
                    aff = next((x.strip() for x in affs if isinstance(x, str) and x.strip()), "")
                    authors_compact.append({
                        "id": a.get("authorId"),
                        "name": name,
                        "aff": aff or None,
                    })
                cache[pid] = {
                    "citation_count": int(rec.get("citationCount") or 0),
                    "influential_count": int(rec.get("influentialCitationCount") or 0),
                    "fetched": today,
                    "found": True,
                    "authors": authors_compact,
                }
                fetched_count += 1
        time.sleep(SLEEP_BETWEEN)

    save_cache(cache, cache_path)
    print(f"  citations: fetched {fetched_count} found, {null_count} not in S2", file=sys.stderr)

    return {pid: cache[pid] for pid in ids if pid in cache}


def _normalize_affiliation(s: str) -> str:
    """Trim corporate/university suffixes so 'Stanford University' and
    'Stanford' fold together for the per-paper primary tag.
    """
    s = (s or "").strip()
    # Strip everything after the first comma (handles 'Stanford, CA')
    if "," in s:
        s = s.split(",")[0].strip()
    return s


def _pick_primary_affiliation(authors: list) -> Optional[str]:
    """Return the most-common affiliation among the paper's authors, or None.

    S2 affiliation data is patchy. We bias toward whichever institution shows
    up most in the author list — that's usually 'where this paper was done'.
    Ties go to the first author's affiliation (typically the lead student).
    """
    if not authors:
        return None
    counts: Dict[str, int] = {}
    first_aff = None
    for a in authors:
        aff = _normalize_affiliation(a.get("aff") or "")
        if not aff:
            continue
        if first_aff is None:
            first_aff = aff
        counts[aff] = counts.get(aff, 0) + 1
    if not counts:
        return None
    # Sort by count desc, then by first-author preference
    best = max(counts.items(), key=lambda kv: (kv[1], 1 if kv[0] == first_aff else 0))
    return best[0]


def enrich_paper_index(
    paper_index: Dict[str, dict],
    cache_path: str = CACHE_PATH_DEFAULT,
) -> None:
    """Mutate paper_index in place: add citation_count, influential_count,
    primary_affiliation, and an authors list (with affiliations + S2 ids)
    to every entry that has a Semantic Scholar match. Missing/failed
    entries are left untouched (UI treats absence as 'unknown')."""
    citations = fetch_citations(paper_index.keys(), cache_path=cache_path)
    for pid, rec in citations.items():
        meta = paper_index.get(pid)
        if not meta:
            continue
        if not rec.get("found"):
            continue
        meta["citation_count"] = rec["citation_count"]
        meta["influential_count"] = rec["influential_count"]
        authors = rec.get("authors") or []
        if authors:
            primary = _pick_primary_affiliation(authors)
            if primary:
                meta["primary_affiliation"] = primary
            # Keep the per-paper authors list (id + name + aff) for downstream
            # disambiguation (Active Researchers grouped by S2 authorId).
            meta["s2_authors"] = authors


if __name__ == "__main__":
    # Smoke test: fetch a couple of well-known arxiv ids.
    test_ids = ["1706.03762", "2005.14165"]  # Attention Is All You Need; GPT-3
    out = fetch_citations(test_ids, cache_path="data/citations/cache.json")
    for pid, rec in out.items():
        print(f"{pid}: {rec}")
