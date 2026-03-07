"""
FastAPI service — exposes AI/ML endpoints called by Next.js backend.
Run with: uvicorn server:app --reload --port 8000
"""

import traceback
from typing import Optional

from extractor.skill import (
    HybridSkillExtractor,
    NERSkillExtractor,
    RegularSkillExtractor,
)
from fastapi import FastAPI, HTTPException
from matcher import ResumeJDMatcher
from model import (
    AnalyzeJobRequest,
    AnalyzeJobResponse,
    JobAnalysisResult,
    ResumeAnalysisResult,
    SkillMatchResult,
)
from scorer import JobBERTSemanticScorer

app = FastAPI(title="Resume Copilot AI Service", version="0.1.0")

# ── Lazy-loaded shared resources ──────────────────────────────────────────── #
_scorer: Optional[JobBERTSemanticScorer] = None
_matchers: dict[str, ResumeJDMatcher] = {}


def get_matcher(extractor_name: str = "regular") -> ResumeJDMatcher:
    global _scorer, _matchers
    if extractor_name not in _matchers:
        if _scorer is None:
            _scorer = JobBERTSemanticScorer()
        if extractor_name == "ner":
            extractor = NERSkillExtractor()
        elif extractor_name == "hybrid":
            extractor = HybridSkillExtractor()
        else:
            extractor = RegularSkillExtractor()
        _matchers[extractor_name] = ResumeJDMatcher(extractor=extractor, scorer=_scorer)
    return _matchers[extractor_name]


# ── Request / Response schemas ────────────────────────────────────────────── #


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
        matcher = get_matcher(req.extractor or "regular")
        print("Analyzing using extractor:", req.extractor or "regular")
        result = matcher.match(req.resume_text, req.job_description)

        response = AnalyzeJobResponse(
            job=JobAnalysisResult(
                required_years=result.jd_required_years,
                hard_skills=sorted(result.jd_profile.hard_skills),
                soft_skills=sorted(result.jd_profile.soft_skills),
                text=req.job_description,
            ),
        )

        has_resume = bool((req.resume_text or "").strip())
        if has_resume:
            response.resume = ResumeAnalysisResult(
                hard_skills=sorted(result.resume_profile.hard_skills),
                soft_skills=sorted(result.resume_profile.soft_skills),
                years_of_experience=result.resume_years,
                text=req.resume_text,
            )

            response.match = SkillMatchResult(
                matched_skills=sorted(result.matched_hard | result.matched_soft),
                missing_skills=sorted(result.missing_hard | result.missing_soft),
                skill_score=round(result.hard_skill_score, 4),
                experience_score=round(result.experience_score, 4),
                semantic_score=round(result.semantic_score, 4),
                final_score=round(result.final_score, 4),
                matched_hard_skills=sorted(result.matched_hard),
                missing_hard_skills=sorted(result.missing_hard),
                hard_skill_score=round(result.hard_skill_score, 4),
                matched_soft_skills=sorted(result.matched_soft),
                missing_soft_skills=sorted(result.missing_soft),
                soft_skill_score=round(result.soft_skill_score, 4),
                resume_years=result.resume_years,
                jd_required_years=result.jd_required_years,
            )

        return response

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
