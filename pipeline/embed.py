"""Embed papers via OpenAI text-embedding-3-small.

Reads data/papers/{date}.jsonl, embeds title + abstract per paper,
writes data/embeddings/{date}.jsonl with one record per paper:
    {"id": "<arxiv id>", "v": [<1536 floats>]}

Resume-friendly: skips ids already in the output file.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from typing import List

import dotenv
from openai import OpenAI

if os.path.exists(".env"):
    dotenv.load_dotenv()

EMBED_MODEL = os.environ.get("EMBED_MODEL", "text-embedding-3-small")
BATCH = 100


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--data", required=True, help="path to data/papers/{date}.jsonl")
    p.add_argument("--out-dir", default="data/embeddings", help="output directory")
    return p.parse_args()


def date_from_path(path: str) -> str:
    m = re.search(r"(\d{4}-\d{2}-\d{2})", os.path.basename(path))
    if not m:
        raise ValueError(f"could not extract date from {path}")
    return m.group(1)


def text_for_embedding(item: dict) -> str:
    title = (item.get("title") or "").strip()
    abstract = (item.get("summary") or "").strip()
    # Cap at ~6000 chars; abstracts are typically <3000 anyway
    combined = f"{title}\n\n{abstract}"[:6000]
    return combined


def main() -> None:
    # Defensive: empty OPENAI_BASE_URL (unset secret → "") breaks the SDK.
    if not os.environ.get("OPENAI_BASE_URL", "").strip():
        os.environ.pop("OPENAI_BASE_URL", None)

    args = parse_args()
    if not os.path.exists(args.data):
        print(f"input not found: {args.data}", file=sys.stderr)
        sys.exit(0)

    items: List[dict] = []
    with open(args.data) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    if not items:
        print("no items to embed", file=sys.stderr)
        sys.exit(0)

    date = date_from_path(args.data)
    os.makedirs(args.out_dir, exist_ok=True)
    out_path = os.path.join(args.out_dir, f"{date}.jsonl")

    # Resume: load already-embedded ids
    done: set[str] = set()
    if os.path.exists(out_path):
        with open(out_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if rec.get("id"):
                    done.add(rec["id"])

    todo = [it for it in items if it.get("id") and it["id"] not in done]
    if not todo:
        print(f"all {len(items)} papers already embedded; nothing to do", file=sys.stderr)
        return

    print(f"Embedding {len(todo)} papers (skipping {len(done)} done) with {EMBED_MODEL}", file=sys.stderr)
    client = OpenAI()
    with open(out_path, "a") as out:
        for start in range(0, len(todo), BATCH):
            chunk = todo[start:start + BATCH]
            texts = [text_for_embedding(it) for it in chunk]
            try:
                resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
            except Exception as e:
                print(f"  batch starting {start} failed: {e}", file=sys.stderr)
                continue
            for it, datum in zip(chunk, resp.data):
                out.write(json.dumps({
                    "id": it["id"],
                    "v": [round(x, 4) for x in datum.embedding],
                }) + "\n")
            print(f"  embedded {start + len(chunk)}/{len(todo)}", file=sys.stderr)
    print(f"Wrote {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
