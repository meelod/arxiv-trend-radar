"""arXiv ingestion via OAI-PMH (daily, backfill) and Atom API (specific ids).

Modes:
    --daily                       fetch yesterday's announced papers
    --from YYYY-MM-DD --until YYYY-MM-DD   fetch range (inclusive of from, exclusive of until)
    --ids 2604.12345,2604.67890   fetch specific arxiv ids via Atom API

Output: appends to data/papers/{date}.jsonl, where {date} is the start of the
fetched window. Resume-friendly: if the file already exists, IDs already present
are skipped. The script is idempotent — running twice over the same range produces
the same output.

Usage from a cron context:
    python pipeline/fetch.py --daily

OAI-PMH endpoint: http://export.arxiv.org/oai2
Atom API endpoint: http://export.arxiv.org/api/query
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional
from urllib.parse import urlencode

import requests

OAI_BASE = "http://export.arxiv.org/oai2"
ATOM_BASE = "http://export.arxiv.org/api/query"

# arXiv namespaces
NS = {
    "oai": "http://www.openarchives.org/OAI/2.0/",
    "arxiv": "http://arxiv.org/OAI/arXiv/",
    "atom": "http://www.w3.org/2005/Atom",
}

DELAY_SECONDS = 3.0  # arXiv recommends ~1 req/3s, conservative
USER_AGENT = "arxiv-trend-radar/0.1 (https://github.com/meelod/arxiv-trend-radar)"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out-dir", default="data/papers", help="output directory")
    p.add_argument("--daily", action="store_true", help="fetch yesterday's papers")
    p.add_argument("--from", dest="from_date", help="start date YYYY-MM-DD (inclusive)")
    p.add_argument("--until", dest="until_date", help="end date YYYY-MM-DD (exclusive)")
    p.add_argument("--ids", help="comma-separated arxiv ids (uses Atom API)")
    p.add_argument("--categories", help="comma-separated categories; defaults to CATEGORIES env var")
    return p.parse_args()


def get_categories() -> list[str]:
    raw = os.environ.get("CATEGORIES", "")
    if not raw.strip():
        print("ERROR: CATEGORIES env var not set", file=sys.stderr)
        sys.exit(1)
    return [c.strip() for c in raw.split(",") if c.strip()]


def load_done_ids(out_path: str) -> set[str]:
    if not os.path.exists(out_path):
        return set()
    done: set[str] = set()
    with open(out_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            pid = rec.get("id")
            if pid:
                done.add(pid)
    return done


def http_get(url: str, params: Optional[dict] = None, timeout: int = 30) -> str:
    """GET with retry on 503/429."""
    headers = {"User-Agent": USER_AGENT}
    for attempt in range(5):
        resp = requests.get(url, params=params, headers=headers, timeout=timeout)
        if resp.status_code == 200:
            return resp.text
        if resp.status_code in (429, 503):
            wait = min(60, DELAY_SECONDS * (2 ** attempt))
            print(f"  HTTP {resp.status_code}, retry {attempt + 1}/5 after {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
            continue
        resp.raise_for_status()
    raise RuntimeError(f"failed after 5 retries: {url}")


# ---------------------------------------------------------------------------
# OAI-PMH path (daily and backfill)
# ---------------------------------------------------------------------------

def oai_set_for_category(category: str) -> str:
    """Convert arXiv category code to OAI-PMH set spec.
    cs.AI -> cs:cs:AI ; eess.SP -> eess:eess:SP ; q-fin.TR -> q-fin:q-fin:TR
    Top-level archives without subcategory (e.g. quant-ph) -> just the archive name.
    """
    if "." in category:
        archive, sub = category.split(".", 1)
        return f"{archive}:{archive}:{sub}"
    return category


def parse_oai_record(record: ET.Element) -> Optional[dict]:
    """Parse one <oai:record> element into our paper dict shape."""
    metadata = record.find("oai:metadata", NS)
    if metadata is None:
        return None
    arxiv_el = metadata.find("arxiv:arXiv", NS)
    if arxiv_el is None:
        return None

    def text(tag: str) -> str:
        el = arxiv_el.find(f"arxiv:{tag}", NS)
        return el.text.strip() if el is not None and el.text else ""

    arxiv_id = text("id")
    if not arxiv_id:
        return None

    authors = []
    authors_el = arxiv_el.find("arxiv:authors", NS)
    if authors_el is not None:
        for a in authors_el.findall("arxiv:author", NS):
            keyname = a.find("arxiv:keyname", NS)
            forenames = a.find("arxiv:forenames", NS)
            parts = []
            if forenames is not None and forenames.text:
                parts.append(forenames.text.strip())
            if keyname is not None and keyname.text:
                parts.append(keyname.text.strip())
            if parts:
                authors.append(" ".join(parts))

    categories_text = text("categories")
    categories = categories_text.split() if categories_text else []

    return {
        "id": arxiv_id,
        "title": " ".join(text("title").split()),
        "authors": authors,
        "summary": text("abstract"),
        "categories": categories,
        "abs": f"https://arxiv.org/abs/{arxiv_id}",
        "pdf": f"https://arxiv.org/pdf/{arxiv_id}",
        "comment": text("comments"),
        "doi": text("doi"),
        "journal_ref": text("journal-ref"),
        "published": text("created"),
        "updated": text("updated"),
    }


def fetch_oai_window(
    category: str,
    from_date: str,
    until_date: str,
) -> Iterable[dict]:
    """Yield paper dicts from OAI-PMH for one category over [from_date, until_date)."""
    set_spec = oai_set_for_category(category)
    params = {
        "verb": "ListRecords",
        "from": from_date,
        "until": until_date,
        "set": set_spec,
        "metadataPrefix": "arXiv",
    }
    page = 0
    while True:
        page += 1
        print(f"  [OAI] {category} page {page} (from={from_date} until={until_date})", file=sys.stderr)
        xml_text = http_get(OAI_BASE, params=params)
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            print(f"  XML parse error: {e}", file=sys.stderr)
            return

        # Check for OAI errors
        err = root.find("oai:error", NS)
        if err is not None:
            code = err.get("code", "?")
            if code == "noRecordsMatch":
                return  # empty window for this category, normal
            print(f"  OAI error [{code}]: {err.text}", file=sys.stderr)
            return

        list_records = root.find("oai:ListRecords", NS)
        if list_records is None:
            return

        for record in list_records.findall("oai:record", NS):
            paper = parse_oai_record(record)
            if paper:
                yield paper

        token_el = list_records.find("oai:resumptionToken", NS)
        if token_el is None or not (token_el.text or "").strip():
            return  # last page

        # Use resumption token for next page; OAI-PMH replaces all params with just verb+token
        params = {"verb": "ListRecords", "resumptionToken": token_el.text.strip()}
        time.sleep(DELAY_SECONDS)


# ---------------------------------------------------------------------------
# Atom API path (specific ids)
# ---------------------------------------------------------------------------

def parse_atom_entry(entry: ET.Element) -> Optional[dict]:
    def text(tag: str) -> str:
        el = entry.find(f"atom:{tag}", NS)
        return el.text.strip() if el is not None and el.text else ""

    raw_id = text("id")  # http://arxiv.org/abs/2604.12345v1
    m = re.search(r"abs/([^v]+)", raw_id)
    arxiv_id = m.group(1) if m else raw_id.split("/")[-1].split("v")[0]
    if not arxiv_id:
        return None

    authors: list[str] = []
    for a in entry.findall("atom:author", NS):
        name_el = a.find("atom:name", NS)
        if name_el is not None and name_el.text:
            authors.append(name_el.text.strip())

    categories: list[str] = []
    for cat in entry.findall("atom:category", NS):
        term = cat.get("term")
        if term:
            categories.append(term)

    return {
        "id": arxiv_id,
        "title": " ".join(text("title").split()),
        "authors": authors,
        "summary": " ".join(text("summary").split()),
        "categories": categories,
        "abs": f"https://arxiv.org/abs/{arxiv_id}",
        "pdf": f"https://arxiv.org/pdf/{arxiv_id}",
        "comment": "",
        "published": text("published"),
        "updated": text("updated"),
    }


def fetch_atom_ids(ids: list[str]) -> Iterable[dict]:
    # Atom API supports up to 200 ids per call via id_list
    for i in range(0, len(ids), 100):
        batch = ids[i:i + 100]
        params = {"id_list": ",".join(batch), "max_results": str(len(batch))}
        print(f"  [Atom] fetching {len(batch)} ids", file=sys.stderr)
        xml_text = http_get(ATOM_BASE, params=params)
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            print(f"  XML parse error: {e}", file=sys.stderr)
            continue
        for entry in root.findall("atom:entry", NS):
            paper = parse_atom_entry(entry)
            if paper:
                yield paper
        time.sleep(DELAY_SECONDS)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    if args.ids:
        # Specific id fetch — write to a single dated file based on today
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        out_path = os.path.join(args.out_dir, f"{today}.jsonl")
        ids = [i.strip() for i in args.ids.split(",") if i.strip()]
        done = load_done_ids(out_path)
        new = 0
        with open(out_path, "a") as f:
            for paper in fetch_atom_ids(ids):
                if paper["id"] in done:
                    continue
                done.add(paper["id"])
                f.write(json.dumps(paper) + "\n")
                f.flush()
                new += 1
        print(f"Wrote {new} new records to {out_path}", file=sys.stderr)
        return

    # Determine date window
    if args.daily:
        # Yesterday in UTC (arXiv announces ~00:00 UTC; safe to fetch yesterday at 02:00 UTC)
        end = datetime.now(timezone.utc).date()
        start = end - timedelta(days=1)
    elif args.from_date and args.until_date:
        start = datetime.strptime(args.from_date, "%Y-%m-%d").date()
        end = datetime.strptime(args.until_date, "%Y-%m-%d").date()
    else:
        print("ERROR: specify --daily, --from/--until, or --ids", file=sys.stderr)
        sys.exit(2)

    if start >= end:
        print(f"ERROR: from ({start}) must be before until ({end})", file=sys.stderr)
        sys.exit(2)

    cats_arg = args.categories or os.environ.get("CATEGORIES", "")
    if not cats_arg.strip():
        print("ERROR: CATEGORIES env var or --categories arg required", file=sys.stderr)
        sys.exit(1)
    categories = [c.strip() for c in cats_arg.split(",") if c.strip()]

    # File granularity: one JSONL per UTC day. We split the window into days.
    total_new = 0
    cur = start
    while cur < end:
        next_day = cur + timedelta(days=1)
        out_path = os.path.join(args.out_dir, f"{cur.isoformat()}.jsonl")
        done = load_done_ids(out_path)
        before = len(done)
        with open(out_path, "a") as f:
            for cat in categories:
                for paper in fetch_oai_window(cat, cur.isoformat(), next_day.isoformat()):
                    if paper["id"] in done:
                        continue
                    done.add(paper["id"])
                    f.write(json.dumps(paper) + "\n")
                    f.flush()
        added = len(done) - before
        total_new += added
        print(f"{cur.isoformat()}: +{added} new ({len(done)} total in file)", file=sys.stderr)
        cur = next_day

    print(f"Done. Wrote {total_new} new papers across {(end - start).days} day(s).", file=sys.stderr)


if __name__ == "__main__":
    main()
