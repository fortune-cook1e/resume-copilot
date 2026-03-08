"""Data classes for skill extraction and matching."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from pydantic import BaseModel


@dataclass
class ParsedJD:
    """从 JD 解析出的结构化信息"""

    # raw_text: str
    # title: str = ""
    # sections: dict = field(default_factory=dict)
    # requirements_text: str = ""
    hard_skills: set = field(default_factory=set)
    soft_skills: set = field(default_factory=set)
    required_years: float = 0.0


@dataclass
class SkillProfile:
    """技能画像 (hard + soft)"""

    hard_skills: set[str] = field(default_factory=set)
    soft_skills: set[str] = field(default_factory=set)


@dataclass
class MatchResult:
    """综合匹配结果"""

    hard_skill_score: float
    soft_skill_score: float
    experience_score: float
    semantic_score: float
    final_score: float
    matched_hard: set[str]
    missing_hard: set[str]
    matched_soft: set[str]
    missing_soft: set[str]
    resume_years: float
    jd_required_years: float
    # 保留提取的完整画像，方便调试
    resume_profile: SkillProfile = field(default_factory=SkillProfile)
    jd_profile: SkillProfile = field(default_factory=SkillProfile)


@dataclass
class EvalMetrics:
    """单项评估指标 (Precision / Recall / F1)"""

    precision: float
    recall: float
    f1: float
    true_positives: set[str]
    false_positives: set[str]
    false_negatives: set[str]


@dataclass
class NERExtractionEval:
    """NER 提取方案完整评估结果"""

    hard_metrics: EvalMetrics
    soft_metrics: EvalMetrics


class AnalyzeJobRequest(BaseModel):
    """Request schema for analyzing a job description."""

    job_description: str
    resume_text: str = None
    extractor: Optional[str] = None  # e.g. "regular" | "ner" | "hybrid"


class SkillMatchResult(BaseModel):
    """综合技能匹配结果，包含向后兼容的 matched_skills / missing_skills 字段，以及细分的 hard/soft 结果"""

    # 向后兼容: matched_skills / missing_skills 合并 hard + soft
    matched_skills: list[str]
    missing_skills: list[str]
    skill_score: float
    experience_score: float
    semantic_score: float
    final_score: float
    # 新增: 细分 hard / soft
    matched_hard_skills: list[str]
    missing_hard_skills: list[str]
    hard_skill_score: float
    matched_soft_skills: list[str]
    missing_soft_skills: list[str]
    soft_skill_score: float
    resume_years: float
    jd_required_years: float


class JobAnalysisResult(BaseModel):
    """Parsed job information extracted from raw JD text."""

    required_years: float
    hard_skills: list[str]
    soft_skills: list[str]
    text: str


class ResumeAnalysisResult(BaseModel):
    """Parsed resume information: extracted skills + years of experience."""

    hard_skills: list[str]
    soft_skills: list[str]
    years_of_experience: float
    text: str


class AnalyzeJobResponse(BaseModel):
    """Response schema for job analysis and optional resume matching."""

    job: Optional[JobAnalysisResult] = None
    resume: Optional[ResumeAnalysisResult] = None
    match: Optional[SkillMatchResult] = None


# ── 新增：解析后的简历响应模型 ────────────────────────────────────────── #


class ParsedResumeData(BaseModel):
    title: str
    description: Optional[str] = ""
    extracted_text: str  # 提取的原始文本，可供后续 NLP 进一步处理
    # 你可以根据需求增加更多字段，如 skills: List[str]
