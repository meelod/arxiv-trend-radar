"""Generate the daily briefing — one LLM call synthesizing all today's papers.

Reads data/papers/{date}.jsonl, calls a single structured-output LLM call
with all papers and the user's INTERESTS, writes data/briefings/{date}.json.

The briefing has: headline, executive_overview, themes, top_picks, worth_noting.
See pipeline/structures.py for the schema.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from typing import List

import dotenv
import numpy as np
from openai import OpenAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)

# Allow running as module or as script
try:
    from pipeline.structures import DailyBriefing
    from pipeline.citations import enrich_paper_index
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from pipeline.structures import DailyBriefing
    from pipeline.citations import enrich_paper_index

if os.path.exists(".env"):
    dotenv.load_dotenv()

PROMPT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts")
SYSTEM_PROMPT = open(os.path.join(PROMPT_DIR, "briefing_system.txt")).read()

USER_TEMPLATE = """Today's date: {date}
Total papers: {paper_count}

Papers (id | primary_category | title | abstract):

{papers}

Produce the DailyBriefing now."""


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--data", required=True, help="path to data/papers/{date}.jsonl")
    p.add_argument("--out-dir", default="data/briefings", help="output dir")
    return p.parse_args()


def date_from_path(path: str) -> str:
    m = re.search(r"(\d{4}-\d{2}-\d{2})", os.path.basename(path))
    if not m:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return m.group(1)


def format_paper(item: dict) -> str:
    pid = item.get("id", "?")
    cats = item.get("categories") or []
    primary = cats[0] if cats else "?"
    title = (item.get("title") or "").strip()
    abstract = (item.get("summary") or "").strip()
    # Cap abstract at 600 chars — first sentence or two is enough signal for the
    # synthesis. Going over this risks blowing the per-minute token budget on
    # heavy days even after pre-filtering.
    if len(abstract) > 600:
        abstract = abstract[:600].rstrip() + "..."
    return f"[{pid}] [{primary}] {title}\n  {abstract}"


def load_embeddings_for(papers_jsonl: str) -> dict:
    """Load the sibling embeddings file produced by embed.py for the same date."""
    emb_path = papers_jsonl.replace("/papers/", "/embeddings/")
    if not os.path.exists(emb_path):
        return {}
    by_id: dict = {}
    with open(emb_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            pid = rec.get("id")
            v = rec.get("v")
            if pid and v:
                by_id[pid] = np.asarray(v, dtype=np.float32)
    return by_id


def filter_papers_by_interests(
    papers: List[dict],
    interests: str,
    embeddings: dict,
    max_papers: int,
) -> List[dict]:
    """Pre-filter papers to the top-N most relevant to the user's INTERESTS.

    Uses cosine similarity between each paper's embedding (already computed by
    embed.py earlier in the workflow) and an embedding of the INTERESTS string.

    Falls back to first-N if embeddings unavailable. Adds 20 random "wildcard"
    picks at the bottom to preserve serendipity beyond the personalized signal.
    """
    if len(papers) <= max_papers:
        return papers

    if not embeddings or not interests.strip():
        # No embeddings or no interests: just truncate
        print(f"  filter: no embeddings or interests; taking first {max_papers}", file=sys.stderr)
        return papers[:max_papers]

    # Embed the interests string (one cheap call)
    try:
        client = OpenAI()
        resp = client.embeddings.create(model="text-embedding-3-small", input=interests)
        interests_vec = np.asarray(resp.data[0].embedding, dtype=np.float32)
        interests_norm = interests_vec / (np.linalg.norm(interests_vec) + 1e-9)
    except Exception as e:
        print(f"  filter: failed to embed interests ({e}); taking first {max_papers}", file=sys.stderr)
        return papers[:max_papers]

    scored = []
    unscored = []
    for p in papers:
        v = embeddings.get(p.get("id"))
        if v is None:
            unscored.append(p)
            continue
        v_norm = v / (np.linalg.norm(v) + 1e-9)
        sim = float(np.dot(v_norm, interests_norm))
        scored.append((sim, p))

    scored.sort(key=lambda x: x[0], reverse=True)

    # Take top (max_papers - 20) by relevance, plus 20 random wildcards from the rest
    keep_top = max(1, max_papers - 20)
    top = [p for _, p in scored[:keep_top]]

    # Wildcards: random sample from the unselected papers (preserves serendipity)
    rest = [p for _, p in scored[keep_top:]] + unscored
    if rest:
        import random
        random.seed(42)
        wildcards = random.sample(rest, min(20, len(rest)))
        top.extend(wildcards)

    print(f"  filter: kept {len(top)} of {len(papers)} papers ({keep_top} by relevance + {len(top) - keep_top} wildcards)", file=sys.stderr)
    return top


def main() -> None:
    if not os.environ.get("OPENAI_BASE_URL", "").strip():
        os.environ.pop("OPENAI_BASE_URL", None)

    args = parse_args()

    if not os.path.exists(args.data):
        print(f"input not found: {args.data}", file=sys.stderr)
        sys.exit(0)

    papers: List[dict] = []
    with open(args.data) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                papers.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    if not papers:
        print("no papers; skipping briefing", file=sys.stderr)
        sys.exit(0)

    date = date_from_path(args.data)
    model_name = os.environ.get("MODEL_NAME", "gpt-4o")
    language = os.environ.get("LANGUAGE", "English")
    interests = os.environ.get("INTERESTS", "").strip() or "(no specific interests configured; rank top picks by general technical importance)"
    max_papers = int(os.environ.get("BRIEFING_MAX_PAPERS", "400"))

    print(f"Briefing {date}: {len(papers)} papers loaded, model={model_name}", file=sys.stderr)

    # Pre-filter to the top N most relevant to user interests, to stay under
    # the OpenAI tokens-per-minute limit and to focus the LLM on signal.
    embeddings = load_embeddings_for(args.data)
    papers = filter_papers_by_interests(papers, interests, embeddings, max_papers)

    paper_blocks = "\n\n".join(format_paper(p) for p in papers)

    llm = ChatOpenAI(model=model_name).with_structured_output(DailyBriefing, method="function_calling")
    prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT),
        HumanMessagePromptTemplate.from_template(USER_TEMPLATE),
    ])
    chain = prompt | llm

    try:
        briefing: DailyBriefing = chain.invoke({
            "language": language,
            "interests": interests,
            "date": date,
            "paper_count": len(papers),
            "papers": paper_blocks,
        })
    except Exception as e:
        print(f"LLM call failed: {e}", file=sys.stderr)
        sys.exit(1)

    # Only keep papers actually referenced by the briefing in paper_index.
    # The full corpus shipped here was inflating the JSON payload (and
    # parse time on the client) without being rendered anywhere.
    referenced_ids: set[str] = set()
    for theme in briefing.themes:
        referenced_ids.update(theme.paper_ids or [])
    for pick in briefing.top_picks:
        if pick.arxiv_id:
            referenced_ids.add(pick.arxiv_id)
    for wn in briefing.worth_noting:
        if wn.arxiv_id:
            referenced_ids.add(wn.arxiv_id)

    paper_index = {
        p["id"]: {
            "title": (p.get("title") or "").strip(),
            "authors": p.get("authors", []),
            "abs": p.get("abs") or f"https://arxiv.org/abs/{p['id']}",
            "categories": p.get("categories", []),
            # Note: `summary` (full abstract) is intentionally omitted — the UI
            # never renders it, and including it ~doubles the JSON size.
        }
        for p in papers if p.get("id") and p["id"] in referenced_ids
    }

    # Enrich with citation counts from Semantic Scholar. Only the ~25 papers
    # actually referenced by the briefing — keeps API usage trivial. Most
    # day-of papers will have 0 citations; the rare paper with a real count
    # is usually a v2 of a previously-published paper or a late-flagged
    # cross-list. Surfacing those is the point.
    try:
        enrich_paper_index(paper_index)
    except Exception as e:
        print(f"  citations: enrichment failed ({e}); continuing without", file=sys.stderr)

    out = {
        "date": date,
        "paper_count": len(papers),
        "model": model_name,
        "language": language,
        "headline": briefing.headline,
        "executive_overview": briefing.executive_overview,
        "themes": [t.model_dump() for t in briefing.themes],
        "top_picks": [tp.model_dump() for tp in briefing.top_picks],
        "worth_noting": [wn.model_dump() for wn in briefing.worth_noting],
        "paper_index": paper_index,
    }

    os.makedirs(args.out_dir, exist_ok=True)
    out_path = os.path.join(args.out_dir, f"{date}.json")
    with open(out_path, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out_path}", file=sys.stderr)

    # Maintain a list of available briefings
    list_path = os.path.join(args.out_dir, "briefings-list.txt")
    import glob as _glob
    files = sorted(os.path.basename(p) for p in _glob.glob(os.path.join(args.out_dir, "*.json")))
    with open(list_path, "w") as f:
        for name in files:
            f.write(name + "\n")


if __name__ == "__main__":
    main()
