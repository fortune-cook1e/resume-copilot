"""
通用评分器 — 传入不同 extractor 即可切换方案。
权重固定: hard 0.40 + soft 0.15 + exp 0.15 + semantic 0.30
"""

from extractor.experience import ExperienceExtractor
from extractor.skill import BaseSkillExtractor
from model import MatchResult, SkillProfile
from scorer import JobBERTSemanticScorer

# 统一权重常量
WEIGHT_HARD = 0.40
WEIGHT_SOFT = 0.15
WEIGHT_EXP = 0.15
WEIGHT_SEMANTIC = 0.30


class ResumeJDMatcher:
    def __init__(self, extractor: BaseSkillExtractor, scorer: JobBERTSemanticScorer):
        self.extractor = extractor
        self.scorer = scorer
        self.exp_extractor = ExperienceExtractor()

    @staticmethod
    def _overlap_score(source: set[str], target: set[str]) -> float:
        if not target:
            return 1.0
        return len(source & target) / len(target)

    def match(self, resume_text: str | None, jd_text: str) -> MatchResult:
        resume_text = (resume_text or "").strip()
        jd_text = jd_text or ""

        # 1. JD 侧提取始终执行
        jd_profile = self.extractor.extract(jd_text)
        jd_required_years = self.exp_extractor.extract_years(jd_text)

        # 2. Resume 侧按需执行（无 resume 时短路，避免多余计算）
        if resume_text:
            resume_profile = self.extractor.extract(resume_text)
            resume_years = self.exp_extractor.extract_years(resume_text)
            semantic_score = self.scorer.score(resume_text, jd_text)
        else:
            resume_profile = SkillProfile()
            resume_years = 0.0
            semantic_score = 0.0

        # 3. 技能覆盖率 + 工作年限
        hard_score = self._overlap_score(
            resume_profile.hard_skills, jd_profile.hard_skills
        )
        soft_score = self._overlap_score(
            resume_profile.soft_skills, jd_profile.soft_skills
        )
        exp_score = self.exp_extractor.experience_score(resume_years, jd_required_years)

        # 4. 加权综合
        final = (
            WEIGHT_HARD * hard_score
            + WEIGHT_SOFT * soft_score
            + WEIGHT_EXP * exp_score
            + WEIGHT_SEMANTIC * semantic_score
        )

        return MatchResult(
            hard_skill_score=hard_score,
            soft_skill_score=soft_score,
            experience_score=exp_score,
            semantic_score=semantic_score,
            final_score=final,
            matched_hard=resume_profile.hard_skills & jd_profile.hard_skills,
            missing_hard=jd_profile.hard_skills - resume_profile.hard_skills,
            matched_soft=resume_profile.soft_skills & jd_profile.soft_skills,
            missing_soft=jd_profile.soft_skills - resume_profile.soft_skills,
            resume_years=resume_years,
            jd_required_years=jd_required_years,
            resume_profile=resume_profile,
            jd_profile=jd_profile,
        )
