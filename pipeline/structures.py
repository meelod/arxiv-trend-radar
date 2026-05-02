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

class Company(BaseModel):
    name: str = Field(description="company or product name")
    what_they_do: str = Field(description="one-sentence description of what they build, specific to this cluster's research direction")
    stage: str = Field(description="funding stage if known (e.g. 'Seed', 'Series B', 'Public', 'OSS', 'Acquired'); use 'unknown' if uncertain")
    why_relevant: str = Field(description="one short phrase tying them to this cluster — which capability, paper, or angle they target")


class ClusterAnalysis(BaseModel):
    cluster_id: int
    label: str = Field(description="2-6 word label naming this research direction")
    one_line: str = Field(description="one-sentence description of what the cluster is about")
    existing_companies: List[Company] = Field(
        description="3-7 actual companies, products, or OSS projects working in this space. Be specific — name them. If you genuinely don't know any, return an empty list rather than inventing names. Prefer well-known incumbents and recent funded startups you have specific knowledge of.",
    )
    existing_landscape: str = Field(description="2-4 sentences synthesizing the competitive landscape based on the companies listed above and any others you know of")
    research_industry_gap: str = Field(description="2-4 sentences identifying the specific mismatch between research direction and what those shipping products cover; concrete, not generic. Reference specific companies from existing_companies when relevant.")
    startup_thesis: str = Field(description="3-5 sentences describing what a startup could build, who would pay, why it's defensible against the listed companies")
    why_now: str = Field(description="1-2 sentences tying to growth/status signal — what makes this the right moment")
    risks: str = Field(description="1-2 sentences on what could kill this thesis (often: a listed company adding the missing capability)")
    confidence: str = Field(description="one of: high, medium, low — how confident the gap is real and the thesis is non-obvious given the companies above")


class TrendsReport(BaseModel):
    overview: str = Field(description="3-5 sentence summary of what's happening across the corpus this period: convergence, surprises, where research is consolidating, what's accelerating, what dropped")
    top_clusters: List[ClusterAnalysis] = Field(description="ranked list of clusters with full gap analysis, best opportunity first; OK to return fewer than the input count if some clusters lack genuine opportunity")
