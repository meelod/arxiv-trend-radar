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
    arxiv_id: str = Field(description="arXiv id of the paper")
    title: str = Field(description="paper title")
    why_it_matters: str = Field(description="2-3 sentences explaining specifically why this paper is relevant to the user's stated interests; cite the interest if helpful")
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
    existing_landscape: str = Field(description="2-4 sentences naming actual companies/products/OSS that already serve this; if none come to mind, say so honestly")
    research_industry_gap: str = Field(description="2-4 sentences identifying the specific mismatch between research direction and shipping products; concrete, not generic")
    startup_thesis: str = Field(description="3-5 sentences describing what a startup could build, who would pay, why it's defensible")
    why_now: str = Field(description="1-2 sentences tying to growth/status signal — what makes this the right moment")
    risks: str = Field(description="1-2 sentences on what could kill this thesis")
    confidence: str = Field(description="one of: high, medium, low — how confident the gap is real and the thesis is non-obvious")


class TrendsReport(BaseModel):
    overview: str = Field(description="3-5 sentence summary of what's happening across the corpus this period: convergence, surprises, where research is consolidating, what's accelerating, what dropped")
    top_clusters: List[ClusterAnalysis] = Field(description="ranked list of clusters with full gap analysis, best opportunity first; OK to return fewer than the input count if some clusters lack genuine opportunity")
