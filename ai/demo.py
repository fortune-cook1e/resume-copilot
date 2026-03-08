"""
Demo — 同一组文本, Regular / NER / Hybrid 三种方案对比 + NER evaluation。

运行: python -m NER.demo
"""

from evaluator import NERExtractorEvaluator
from extractor import HybridSkillExtractor, NERSkillExtractor, RegularSkillExtractor
from matcher import ResumeJDMatcher
from model import MatchResult, NERExtractionEval
from scorer import JobBERTSemanticScorer

# ── 测试文本 ──────────────────────────────────────────────────────────────── #

JD_TEXT = (
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

RESUME_TEXT = (
    "Full Stack Developer with 4 years of experience. "
    "Proficient in TypeScript, React, Node.js, PostgreSQL, and Docker. "
    "Built real-time features with WebSockets and Redis. "
    "Experienced with CI/CD pipelines (GitHub Actions), AWS S3, and Sentry. "
    "Strong communication skills, collaborative team player, proactive problem solver."
)


# ── Printing Helpers ──────────────────────────────────────────────────────── #


def _print_match_result(label: str, result: MatchResult) -> None:
    print(f"\n{'=' * 60}")
    print(f"📊  [{label}] Resume ↔ JD 匹配报告")
    print(f"{'=' * 60}")

    print(f"\n🔧 Hard Skill 命中率:  {result.hard_skill_score:.1%}")
    print(f"   Resume 提取: {sorted(result.resume_profile.hard_skills)}")
    print(f"   JD 提取:     {sorted(result.jd_profile.hard_skills)}")
    print(f"   ✅ 匹配: {sorted(result.matched_hard) or '(无)'}")
    print(f"   ❌ 缺失: {sorted(result.missing_hard) or '(无)'}")

    print(f"\n🤝 Soft Skill 命中率:  {result.soft_skill_score:.1%}")
    print(f"   Resume 提取: {sorted(result.resume_profile.soft_skills)}")
    print(f"   JD 提取:     {sorted(result.jd_profile.soft_skills)}")
    print(f"   ✅ 匹配: {sorted(result.matched_soft) or '(无)'}")
    print(f"   ❌ 缺失: {sorted(result.missing_soft) or '(无)'}")

    print(f"\n📅 工作年限:  {result.experience_score:.1%}")
    print(
        f"   Resume: {result.resume_years:.0f} 年  |  "
        f"JD 要求: {result.jd_required_years:.0f} 年"
    )

    print(f"\n🧠 语义相似度 (JobBERT): {result.semantic_score:.4f}")
    print(f"\n🏆 综合匹配分数: {result.final_score:.1%}")


def _print_eval(label: str, ev: NERExtractionEval) -> None:
    print(f"\n{'=' * 60}")
    print(f"🔬  [{label}] NER Evaluation")
    print(f"{'=' * 60}")

    for name, m in [("Hard Skills", ev.hard_metrics), ("Soft Skills", ev.soft_metrics)]:
        print(f"\n  {name}:")
        print(
            f"    Precision: {m.precision:.2%}  |  "
            f"Recall: {m.recall:.2%}  |  F1: {m.f1:.2%}"
        )
        if m.true_positives:
            print(f"    TP (正确): {sorted(m.true_positives)}")
        if m.false_positives:
            print(f"    FP (多提): {sorted(m.false_positives)}")
        if m.false_negatives:
            print(f"    FN (漏提): {sorted(m.false_negatives)}")


# ── Main Demo ─────────────────────────────────────────────────────────────── #


def run_demo():
    # ── 共享语义打分器 (只加载一次) ──
    scorer = JobBERTSemanticScorer()

    # ── 方案 A: Regular ──
    print("\n\n" + "▶" * 30 + "  方案 A: Regular  " + "◀" * 30)
    regular_ext = RegularSkillExtractor()
    regular_matcher = ResumeJDMatcher(extractor=regular_ext, scorer=scorer)
    regular_result = regular_matcher.match(RESUME_TEXT, JD_TEXT)
    _print_match_result("Regular", regular_result)

    # ── 方案 B: NER ──
    print("\n\n" + "▶" * 30 + "  方案 B: NER  " + "◀" * 30)
    ner_ext = NERSkillExtractor()
    ner_matcher = ResumeJDMatcher(extractor=ner_ext, scorer=scorer)
    ner_result = ner_matcher.match(RESUME_TEXT, JD_TEXT)
    _print_match_result("NER", ner_result)

    # ── 方案 C: Hybrid ──
    print("\n\n" + "▶" * 30 + "  方案 C: Hybrid  " + "◀" * 30)
    hybrid_ext = HybridSkillExtractor(
        regular_extractor=regular_ext,
        ner_extractor=ner_ext,
    )
    hybrid_matcher = ResumeJDMatcher(extractor=hybrid_ext, scorer=scorer)
    hybrid_result = hybrid_matcher.match(RESUME_TEXT, JD_TEXT)
    _print_match_result("Hybrid", hybrid_result)

    # ── NER vs Regular Evaluation (以 Regular 为 baseline) ──
    print("\n\n" + "▶" * 30 + "  NER Evaluation  " + "◀" * 30)
    jd_eval = NERExtractorEvaluator.evaluate_ner_vs_regular(
        JD_TEXT, ner_ext, regular_ext
    )
    _print_eval("JD 文本", jd_eval)

    resume_eval = NERExtractorEvaluator.evaluate_ner_vs_regular(
        RESUME_TEXT, ner_ext, regular_ext
    )
    _print_eval("Resume 文本", resume_eval)

    # ── 也可以用手动 ground truth 做评估 ──
    print("\n\n" + "▶" * 30 + "  NER vs Ground Truth  " + "◀" * 30)
    gt_hard = {
        "typescript",
        "node.js",
        "react",
        "postgresql",
        "redis",
        "docker",
        "aws s3",
        "websockets",
        "sentry",
    }
    gt_soft = {"communication", "teamwork"}
    ner_jd_profile = ner_ext.extract(JD_TEXT)
    gt_eval = NERExtractorEvaluator.evaluate_against_ground_truth(
        ner_jd_profile, gt_hard, gt_soft
    )
    _print_eval("JD vs 手动标注 Ground Truth", gt_eval)

    # ── 分数对比总结 ──
    print(f"\n\n{'=' * 60}")
    print("📋  分数对比总结")
    print(f"{'=' * 60}")
    print(f"{'维度':<20} | {'Regular':>10} | {'NER':>10} | {'Hybrid':>10}")
    print(f"{'-' * 20}-+-{'-' * 10}-+-{'-' * 10}-+-{'-' * 10}")
    print(
        f"{'Hard Skill':<20} | {regular_result.hard_skill_score:>9.1%} | {ner_result.hard_skill_score:>9.1%} | {hybrid_result.hard_skill_score:>9.1%}"
    )
    print(
        f"{'Soft Skill':<20} | {regular_result.soft_skill_score:>9.1%} | {ner_result.soft_skill_score:>9.1%} | {hybrid_result.soft_skill_score:>9.1%}"
    )
    print(
        f"{'Experience':<20} | {regular_result.experience_score:>9.1%} | {ner_result.experience_score:>9.1%} | {hybrid_result.experience_score:>9.1%}"
    )
    print(
        f"{'Semantic':<20} | {regular_result.semantic_score:>9.4f} | {ner_result.semantic_score:>9.4f} | {hybrid_result.semantic_score:>9.4f}"
    )
    print(
        f"{'Final Score':<20} | {regular_result.final_score:>9.1%} | {ner_result.final_score:>9.1%} | {hybrid_result.final_score:>9.1%}"
    )
    print(f"{'=' * 60}")


if __name__ == "__main__":
    run_demo()
