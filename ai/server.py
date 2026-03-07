"""
FastAPI service — exposes AI/ML endpoints called by Next.js backend.
Run with: uvicorn server:app --reload --port 8000
"""

import traceback
# 新增pdf文件处理相关库
import io  # 新增：处理二进制流
import pdfplumber  # 新增：PDF 解析库
from typing import Optional, List # 确保引入 List
from fastapi import FastAPI, HTTPException, UploadFile, File # 新增：UploadFile 和 File
# 新增结束
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

# ── 新增：解析后的简历响应模型 ────────────────────────────────────────── #
class ParsedResumeData(BaseModel):
    title: str
    description: Optional[str] = ""
    extracted_text: str  # 提取的原始文本，可供后续 NLP 进一步处理
    # 你可以根据需求增加更多字段，如 skills: List[str]

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
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

        # 3. 结构化处理 (简易 NLP 逻辑)
        # 实际开发中，这里通常会调用 LLM (如 GPT-4) 来根据 raw_text 生成结构化 JSON
        # 这里演示一个简单的逻辑：提取第一行作为标题
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
        suggested_title = lines[0] if lines else "New Resume"
        suggested_desc = " ".join(lines[1:3]) if len(lines) > 1 else ""

        return ParsedResumeData(
            title=suggested_title,
            description=suggested_desc,
            extracted_text=raw_text
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
