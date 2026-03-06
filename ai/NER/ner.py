"""
Resume ↔ JD 综合匹配评分系统

Pipeline:
  1. jjzha/jobbert_skill_extraction   → soft skill NER (沟通能力、领导力等)
  2. jjzha/jobbert_knowledge_extraction → hard skill NER (Python、React 等)
  3. jjzha/jobbert-base-cased          → 基座 MLM 模型，提取 embedding 计算语义相似度

最终分数 = w_hard * hard_score + w_soft * soft_score + w_exp * exp_score + w_semantic * semantic_score
"""

import re
from dataclasses import dataclass, field

import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer, pipeline

# ─── Data Classes ─────────────────────────────────────────────────────────── #


@dataclass
class SkillProfile:
    """NER 提取后的技能画像"""

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


# ─── Skill Extractor (Dual NER) ──────────────────────────────────────────── #


class DualSkillExtractor:
    """
    使用两个 token-classification pipeline:
      - jobbert_skill_extraction     → soft skills
      - jobbert_knowledge_extraction → hard skills (技术 / 知识型技能)
    """

    def __init__(self):
        print("🚀 正在加载 Soft Skill NER: jjzha/jobbert_skill_extraction ...")
        self.soft_pipe = pipeline(
            "token-classification",
            model="jjzha/jobbert_skill_extraction",
            aggregation_strategy="first",
        )

        print("🚀 正在加载 Hard Skill NER: jjzha/jobbert_knowledge_extraction ...")
        self.hard_pipe = pipeline(
            "token-classification",
            model="jjzha/jobbert_knowledge_extraction",
            aggregation_strategy="first",
        )

    def _collect(self, ner_results: list[dict]) -> set[str]:
        """
        将 B + I 序列合并为完整技能短语。

        模型标签只有 B / I / O（没有实体类型后缀），
        内置 aggregation_strategy 无法自动合并，这里手动拼接。
        规则: B 开始新实体，后续连续 I 追加到同一实体。
        """
        skills: set[str] = set()
        current: list[str] = []

        for ent in ner_results:
            tag = ent["entity_group"]  # "B" or "I"
            word = ent["word"].strip()

            if tag == "B":
                # 先保存上一个实体
                if current:
                    phrase = " ".join(current).lower()
                    if len(phrase) > 1:
                        skills.add(phrase)
                current = [word]
            elif tag == "I" and current:
                current.append(word)
            else:
                # 孤立的 I 或 O → 结束当前实体
                if current:
                    phrase = " ".join(current).lower()
                    if len(phrase) > 1:
                        skills.add(phrase)
                    current = []

        # 别忘了最后一个实体
        if current:
            phrase = " ".join(current).lower()
            if len(phrase) > 1:
                skills.add(phrase)

        return skills

    def extract(self, text: str) -> SkillProfile:
        hard_results = self.hard_pipe(text)
        soft_results = self.soft_pipe(text)
        # print(f"🔍 Hard Skill NER 结果: {hard_results}")
        print(f"🔍 Soft Skill NER 结果: {soft_results}")
        return SkillProfile(
            hard_skills=self._collect(hard_results),
            soft_skills=self._collect(soft_results),
        )


# ─── Experience Extractor (regex) ─────────────────────────────────────────── #


class ExperienceExtractor:
    """
    用正则从文本中提取工作年限。
    支持常见格式:
      - "5 years of experience"
      - "3-5 years"
      - "5+ years"
      - "at least 3 years"
      - "fresher / entry level"
    """

    # 匹配 "N+ years" / "N years" / "N-M years" 等
    _PATTERNS = [
        # "3-5 years" → 取上限 5
        re.compile(r"(\d+)\s*[-–to]+\s*(\d+)\s*\+?\s*years?", re.IGNORECASE),
        # "5+ years" / "5 years"
        re.compile(r"(\d+)\s*\+?\s*years?", re.IGNORECASE),
    ]

    @classmethod
    def extract_years(cls, text: str) -> float:
        """返回从文本中提取的最大年限数值，未找到返回 0.0"""
        if not text:
            return 0.0

        lower = text.lower()
        if "fresher" in lower or "entry level" in lower or "entry-level" in lower:
            return 0.0

        years: list[float] = []
        for pat in cls._PATTERNS:
            for m in pat.finditer(text):
                # 如果有两个 group（区间），取上限
                nums = [float(g) for g in m.groups() if g is not None]
                years.append(max(nums))

        return max(years) if years else 0.0

    @classmethod
    def experience_score(cls, resume_years: float, required_years: float) -> float:
        """
        年限匹配分数:
          - JD 没有要求 → 1.0
          - resume >= required → 1.0
          - resume < required → resume / required (线性衰减)
        """
        if required_years <= 0:
            return 1.0
        return min(resume_years / required_years, 1.0)


# ─── Semantic Scorer (JobBERT base) ──────────────────────────────────────── #


class JobBERTSemanticScorer:
    """
    jjzha/jobbert-base-cased 是一个在招聘语料上继续预训练的 BERT base 模型
    (Masked-LM，没有 NER 头)，非常适合提取 job-domain embedding。

    用法：把 resume 全文和 JD 全文分别做 mean-pool，再算余弦相似度。
    """

    MODEL_NAME = "jjzha/jobbert-base-cased"

    def __init__(self):
        print(f"🚀 正在加载语义模型: {self.MODEL_NAME} ...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)
        self.model = AutoModel.from_pretrained(self.MODEL_NAME)
        self.device = torch.device(
            "mps" if torch.backends.mps.is_available() else "cpu"
        )
        self.model.to(self.device).eval()

    def _embed(self, text: str) -> torch.Tensor:
        """L2-normalised mean-pool embedding, shape [1, H]"""
        inputs = self.tokenizer(
            text, padding=True, truncation=True, max_length=512, return_tensors="pt"
        ).to(self.device)
        with torch.no_grad():
            outputs = self.model(**inputs)
        vec = outputs.last_hidden_state.mean(dim=1)  # [1, H]
        return F.normalize(vec, p=2, dim=1)

    def score(self, text_a: str, text_b: str) -> float:
        """返回两段文本的余弦相似度 [0, 1]"""
        vec_a = self._embed(text_a)
        vec_b = self._embed(text_b)
        return float(torch.mm(vec_a, vec_b.t()).item())


# ─── Comprehensive Matcher ────────────────────────────────────────────────── #


class NERResumeJDMatcher:
    """
    综合评分器，整合:
      - Hard skill 命中率
      - Soft skill 命中率
      - JobBERT 语义相似度
    """

    def __init__(
        self,
        hard_weight: float = 0.40,
        soft_weight: float = 0.15,
        exp_weight: float = 0.15,
        semantic_weight: float = 0.30,
    ):
        self.extractor = DualSkillExtractor()
        self.scorer = JobBERTSemanticScorer()
        self.exp_extractor = ExperienceExtractor()
        self.hard_weight = hard_weight
        self.soft_weight = soft_weight
        self.exp_weight = exp_weight
        self.semantic_weight = semantic_weight

    @staticmethod
    def _overlap_score(source: set[str], target: set[str]) -> float:
        """source 对 target 的覆盖率 (target 为空则返回 1.0)"""
        if not target:
            return 1.0
        return len(source & target) / len(target)

    def match(self, resume_text: str, jd_text: str) -> MatchResult:
        # 1. NER 提取
        resume_profile = self.extractor.extract(resume_text)
        jd_profile = self.extractor.extract(jd_text)
        print("简历技能hard画像:", list(resume_profile.hard_skills))
        print("简历技能soft画像:", list(resume_profile.soft_skills))

        print("JD技能hard画像:", list(jd_profile.hard_skills))
        print("JD技能soft画像:", list(jd_profile.soft_skills))

        # 2. 技能命中率
        hard_score = self._overlap_score(
            resume_profile.hard_skills, jd_profile.hard_skills
        )
        soft_score = self._overlap_score(
            resume_profile.soft_skills, jd_profile.soft_skills
        )

        # 3. 工作年限
        resume_years = self.exp_extractor.extract_years(resume_text)
        jd_required_years = self.exp_extractor.extract_years(jd_text)
        exp_score = self.exp_extractor.experience_score(resume_years, jd_required_years)

        # 4. 语义相似度
        semantic_score = self.scorer.score(resume_text, jd_text)

        # 5. 加权综合
        final = (
            self.hard_weight * hard_score
            + self.soft_weight * soft_score
            + self.exp_weight * exp_score
            + self.semantic_weight * semantic_score
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
        )


# ─── Demo ─────────────────────────────────────────────────────────────────── #


def _print_result(result: MatchResult) -> None:
    print("\n" + "=" * 60)
    print("📊  Resume ↔ JD 综合匹配报告")
    print("=" * 60)

    print(f"\n🔧 Hard Skill 命中率:  {result.hard_skill_score:.1%}")
    print(f"   ✅ 匹配: {sorted(result.matched_hard) or '(无)'}")
    print(f"   ❌ 缺失: {sorted(result.missing_hard) or '(无)'}")

    print(f"\n🤝 Soft Skill 命中率:  {result.soft_skill_score:.1%}")
    print(f"   ✅ 匹配: {sorted(result.matched_soft) or '(无)'}")
    print(f"   ❌ 缺失: {sorted(result.missing_soft) or '(无)'}")

    print(f"\n📅 工作年限匹配:  {result.experience_score:.1%}")
    print(
        f"   Resume: {result.resume_years:.0f} 年  |  JD 要求: {result.jd_required_years:.0f} 年"
    )

    print(f"\n🧠 语义相似度 (JobBERT): {result.semantic_score:.4f}")
    print(f"\n🏆 综合匹配分数: {result.final_score:.1%}")
    print("=" * 60)


def run_demo():
    jd_text = (
        "About the job We're Hiring: Full Stack Developer (Hybrid Stockholm) "
        "Ethira is building the future of third party risk management. What you'll work with: "
        "Backend: TypeScript / Node.js  NestJS (domain-driven architecture)  PostgreSQL with "
        "TypeORM  Redis + BullMQ for queues  LangChain + OpenAI for AI features  WebSockets "
        "(Socket.io). Frontend: React with TypeScript  Vite  TailwindCSS + MUI / Shadcn "
        "TanStack Query  React Hook Form + Zod. Infrastructure: Docker  Railway  AWS S3 "
        "Sentry for observability. What we're looking for: 3-5 years of experience, "
        "Strong TypeScript experience, "
        "comfortable with relational databases and ORMs, interest in AI/LLM integration, "
        "product mindset, excellent communication and teamwork."
    )

    resume_text = (
        "Full Stack Developer with 4 years of experience. "
        "Proficient in TypeScript, React, Node.js, PostgreSQL, and Docker. "
        "Built real-time features with WebSockets and Redis. "
        "Experienced with CI/CD pipelines (GitHub Actions), AWS S3, and Sentry. "
        "Strong communication skills, collaborative team player, proactive problem solver."
    )

    matcher = NERResumeJDMatcher()
    result = matcher.match(resume_text, jd_text)
    _print_result(result)


if __name__ == "__main__":
    run_demo()
