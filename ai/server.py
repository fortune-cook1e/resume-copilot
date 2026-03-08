"""
FastAPI service — exposes AI/ML endpoints called by Next.js backend.
Run with: uvicorn server:app --reload --port 8000
"""

# 新增pdf文件处理相关库
import io  # 新增：处理二进制流
import traceback
from typing import Optional  # 确保引入 List

import pdfplumber  # 新增：PDF 解析库
from extractor.skill import (
    HybridSkillExtractor,
    NERSkillExtractor,
    RegularSkillExtractor,
)
from fastapi import FastAPI, File, HTTPException, UploadFile  # 新增：UploadFile 和 File
from matcher import ResumeJDMatcher

# 新增结束
from model import (
    AnalyzeJobRequest,
    AnalyzeJobResponse,
    JobAnalysisResult,
    ParsedResumeData,
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


# ── 新增：PDF 解析接口 ────────────────────────────────────────────────── #
@app.post("/api/resume/parse-pdf", response_model=ParsedResumeData)
async def parse_resume_pdf(file: UploadFile = File(...)):
    """
    接收 PDF 文件，提取文本并尝试结构化。
    这是一个标准的 NLP 信息抽取流程。
    """
    try:
        # 1. 读取上传的文件内容
        contents = await file.read()

        # 2. 使用 pdfplumber 提取文本 (NLP 预处理步骤)
        raw_text = ""
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    raw_text += page_text + "\n"

        if not raw_text.strip():
            raise HTTPException(
                status_code=400, detail="Could not extract text from PDF."
            )

        # 3. 结构化处理 (简易 NLP 逻辑)
        # 实际开发中，这里通常会调用 LLM (如 GPT-4) 来根据 raw_text 生成结构化 JSON
        # 这里演示一个简单的逻辑：提取第一行作为标题
        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        suggested_title = lines[0] if lines else "New Resume"
        suggested_desc = " ".join(lines[1:3]) if len(lines) > 1 else ""

        return ParsedResumeData(
            title=suggested_title, description=suggested_desc, extracted_text=raw_text
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {str(e)}")


# ── 现有的 analyze_job 接口保持不变 ────────────────────────────────────── #


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
