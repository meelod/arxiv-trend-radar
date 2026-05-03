"""Pydantic schemas for structured LLM output."""
from typing import List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Daily briefing
# ---------------------------------------------------------------------------

class Theme(BaseModel):
    name: str = Field(description="2-6 word theme label naming a research direction surfacing today")
    summary: str = Field(description="1 paragraph (3-5 sentences) synthesizing what's happening in this theme today")
    paper_ids: List[str] = Field(description="arXiv ids of papers belonging to this theme")


class TopPick(BaseModel):
    arxiv_id: str = Field(description="arXiv id of the paper — copy verbatim from input, never invent or transpose")
    title: str = Field(description="paper title")
    plain_english: str = Field(
        description="1-2 sentences describing what the paper actually does in plain English, no jargon. Answer 'what did they build/measure/prove?' as if to a smart non-specialist. This is NOT why it matters to the user — it's the paper's actual contribution. Examples: 'Trains a small LLM by distilling from a frontier model and gets 90% of the bigger model's performance at 1/10 the size' — NOT 'leverages knowledge distillation paradigms for efficient model compression'."
    )
    why_it_matters: str = Field(description="2-3 sentences explaining specifically why this paper is relevant to the user's stated interests; cite the interest if helpful. This is DIFFERENT from plain_english — it's about the user's lens, not the paper's contribution.")
    relevance_score: int = Field(description="1-10, how strongly this paper aligns with the user's stated interests")


class WorthNoting(BaseModel):
    arxiv_id: str
    one_liner: str = Field(description="single sentence summary of why this paper is worth a glance")


class DailyBriefing(BaseModel):
    headline: str = Field(description="single sentence capturing the most notable development of the day")
    executive_overview: str = Field(description="3-5 sentences: what's notable across today's papers, any surprising concentrations, anything a user should know in 30 seconds")
    themes: List[Theme] = Field(description="3-5 themes grouping today's papers; each paper appears in at most one theme; minor papers can be omitted")
    top_picks: List[TopPick] = Field(description="5-10 papers ranked by relevance to the user's stated interests, highest first")
    worth_noting: List[WorthNoting] = Field(description="up to 8 additional papers worth a glance but not deep reading")


# ---------------------------------------------------------------------------
# Weekly trends and gap analysis
# ---------------------------------------------------------------------------

class ClusterAnalysis(BaseModel):
    cluster_id: int
    label: str = Field(description="2-6 word label naming this research direction")
    one_line: str = Field(description="one-sentence description of what the cluster is about")
    existing_landscape: str = Field(description="2-4 sentences synthesizing the competitive landscape — what real companies/products/OSS projects already cover in this space, where they overlap, what they collectively assume. Name specific entities inline (e.g. 'vLLM, TensorRT-LLM, and Fireworks all ...'); do NOT invent names. If you genuinely cannot name any, say so.")
    research_industry_gap: str = Field(description="2-4 sentences identifying the specific mismatch between research direction and what shipping products cover. Concrete, not generic. Name specific companies from the landscape when relevant. Do NOT propose what a startup should build — name the gap, leave the synthesis to the reader.")
    why_now: str = Field(description="1-2 sentences tying to growth/status signal — what makes this the right moment, and what specific recent paper (if any) sharpens the gap")
    risks: str = Field(description="1-2 sentences on what could close this gap or make it less interesting (often: a named incumbent shipping the missing capability)")
    confidence: str = Field(description="one of: high, medium, low — how confident the gap is real and non-obvious given the existing landscape")


class MacroPattern(BaseModel):
    name: str = Field(description="2-6 word name for the pattern")
    summary: str = Field(description="2-3 sentences naming the convergence across clusters and the non-research constraint it presses against (energy, latency, memory bandwidth, capital, regulation) when one genuinely applies. IMPORTANT: refer to the contributing clusters by their concept/label inline (e.g. 'the KV-cache compression cluster', 'agent runtime evaluation'), NOT by raw ID number ('Cluster 12'). The cluster IDs are listed separately in cluster_ids and are not shown to the reader inline. FORBIDDEN: vague generalities like 'AI is evolving rapidly', 'research is consolidating across many areas', 'these clusters all use LLMs' — if you cannot name a specific shared bottleneck or substrate, do not emit the pattern.")
    so_what: str = Field(description="One sentence on the commercial/product implication. Either a platform-shift framing ('X used to require Y; if this holds, X becomes Z') or a concrete buyer-side consequence ('serving margin shifts from raw FLOPs to memory bandwidth allocation'). Must be specific enough that a reader could decide whether to act on it. NO hedge words like 'may', 'could be interesting', 'worth watching'.")
    cluster_ids: List[int] = Field(description="cluster_ids embodying this pattern; >=2. If only one cluster fits, it's not a macro pattern.")


class TrendsReport(BaseModel):
    macro_patterns: List[MacroPattern] = Field(
        default_factory=list,
        description="0-3 cross-cluster patterns visible across the input clusters this period. Return an empty list if no genuine cross-cluster pattern exists — DO NOT invent one. A pattern requires >=2 clusters embodying it AND a non-trivial connection (shared substrate, complementary capability, or competing approach to the same problem). Examples of strong patterns: 'multiple inference clusters all hitting memory-bandwidth ceilings', 'agent and retrieval clusters converging on the same trust/grounding problem'. Examples of weak patterns to skip: 'several clusters use LLMs', 'all clusters involve neural networks'.",
    )
    overview: str = Field(description="3-5 sentence summary of what's happening across the corpus this period: convergence, surprises, where research is consolidating, what's accelerating, what dropped. IMPORTANT: refer to clusters by their concept/label (e.g. 'the LLM-evaluation cluster', 'KV-cache and sparse adaptation'), NEVER by raw ID number ('Cluster 17'). The reader does not see cluster IDs.")
    top_clusters: List[ClusterAnalysis] = Field(description="ranked list of clusters with full gap analysis, best opportunity first; OK to return fewer than the input count if some clusters lack genuine opportunity")
