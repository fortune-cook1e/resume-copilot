"""
NER package — Resume ↔ JD 综合匹配评分系统

Public API:
  - RegularSkillExtractor   (生产环境 — 关键词匹配)
  - NERSkillExtractor        (实验方案 — 双模型 token-classification)
  - JobBERTSemanticScorer    (语义相似度)
  - ResumeJDMatcher          (统一评分器)
  - ExperienceExtractor      (工作年限提取)
  - NERExtractorEvaluator    (P / R / F1 评估)
  - SkillProfile, MatchResult, EvalMetrics, NERExtractionEval  (数据类)
"""
