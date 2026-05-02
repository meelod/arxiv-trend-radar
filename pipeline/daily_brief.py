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
from langchain_openai import ChatOpenAI
from langchain_core.prompts import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)

# Allow running as module or as script
try:
    from pipeline.structures import DailyBriefing
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from pipeline.structures import DailyBriefing

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
    # Cap abstract at ~1200 chars to fit ~200 papers in context
    if len(abstract) > 1200:
        abstract = abstract[:1200].rstrip() + "..."
    return f"[{pid}] [{primary}] {title}\n  {abstract}"


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

    print(f"Briefing {date}: {len(papers)} papers, model={model_name}", file=sys.stderr)

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

    paper_index = {
        p["id"]: {
            "title": (p.get("title") or "").strip(),
            "authors": p.get("authors", []),
            "abs": p.get("abs") or f"https://arxiv.org/abs/{p['id']}",
            "categories": p.get("categories", []),
            "summary": p.get("summary", ""),
        }
        for p in papers if p.get("id")
    }

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
