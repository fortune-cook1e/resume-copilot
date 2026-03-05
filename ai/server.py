"""
FastAPI service — exposes AI/ML endpoints called by Next.js backend.
Run with: uvicorn server:app --reload --port 8000
"""

import traceback
from typing import Optional

from fastapi import FastAPI, HTTPException
from matching.matcher import Matcher
from matching.semantic_matcher import SemanticMatcher
from models.schemas import Candidate, Job
from preprocessing.raw_jd_parser import parse_raw_jd
from pydantic import BaseModel

app = FastAPI(title="Resume Copilot AI Service", version="0.1.0")

# ── Lazy-loaded shared resources ──────────────────────────────────────────── #
_semantic_matcher: Optional[SemanticMatcher] = None
_matcher: Optional[Matcher] = None


def get_matcher() -> Matcher:
    global _semantic_matcher, _matcher
    if _matcher is None:
        _semantic_matcher = SemanticMatcher()
        _matcher = Matcher(
            semantic_matcher=_semantic_matcher,
            skill_weight=0.5,
            exp_weight=0.2,
            semantic_weight=0.3,
        )
    return _matcher


# ── Request / Response schemas ────────────────────────────────────────────── #
class AnalyzeJobRequest(BaseModel):
    job_description: str
    # Optional: structured resume data passed directly from Next.js session
    resume_skills: Optional[list[str]] = None
    resume_years: Optional[float] = None
    resume_text: Optional[str] = None
    resume_id: Optional[str] = None


class SkillMatchResult(BaseModel):
    matched_skills: list[str]
    missing_skills: list[str]
    skill_score: float
    experience_score: float
    semantic_score: float
    final_score: float


class JobAnalysisResult(BaseModel):
    extracted_skills: list[str]
    required_years: float


class AnalyzeJobResponse(BaseModel):
    job: Optional[JobAnalysisResult] = None
    match: Optional[SkillMatchResult] = None


# ── Health check ──────────────────────────────────────────────────────────── #
@app.get("/health")
def health():
    return {"status": "ok"}


# ── Main endpoint ─────────────────────────────────────────────────────────── #
@app.post("/api/resume/analyze", response_model=AnalyzeJobResponse)
def analyze_job(req: AnalyzeJobRequest):
    """
    Parse a raw LinkedIn JD and optionally compute a match score
    against a candidate resume.
    """
    try:
        # 1. Parse raw JD text
        parsed = parse_raw_jd(req.job_description)

        job = Job(
            id="temp",
            skills=parsed.skills,
            required_years=parsed.required_years,
            text=req.job_description,
        )

        response = AnalyzeJobResponse(
            job=JobAnalysisResult(
                # title=parsed.title,
                # sections=parsed.sections,
                # requirements_text=parsed.requirements_text,
                extracted_skills=sorted(parsed.skills),
                required_years=parsed.required_years,
            ),
        )

        # 2. If resume data supplied, compute match score
        if req.resume_skills is not None:
            candidate = Candidate(
                id=req.resume_id or "unknown",
                skills={s.lower().strip() for s in req.resume_skills},
                years_of_experience=req.resume_years or 0.0,
                text=req.resume_text or "",
            )

            matcher = get_matcher()
            explanation = matcher.explain(candidate, job)

            semantic_score = 0.0
            if matcher.semantic_matcher and req.resume_text:
                semantic_score = matcher.semantic_matcher.semantic_score(candidate, job)

            response.match = SkillMatchResult(
                matched_skills=explanation["matched_skills"],
                missing_skills=explanation["missing_skills"],
                skill_score=round(explanation["skill_score"], 4),
                experience_score=round(explanation["experience_score"], 4),
                semantic_score=round(semantic_score, 4),
                final_score=round(explanation["final_score"], 4),
            )

        return response

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
