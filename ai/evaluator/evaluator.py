"""
NER Evaluation — Precision / Recall / F1

以 RegularSkillExtractor 作为 baseline 或手动标注的 ground truth，
评估 NERSkillExtractor 的提取质量。
"""

from __future__ import annotations

from extractor.skill import NERSkillExtractor, RegularSkillExtractor

from ai.model.model import EvalMetrics, NERExtractionEval, SkillProfile


class NERExtractorEvaluator:
    @staticmethod
    def _compute_metrics(predicted: set[str], ground_truth: set[str]) -> EvalMetrics:
        tp = predicted & ground_truth
        fp = predicted - ground_truth
        fn = ground_truth - predicted

        precision = len(tp) / len(predicted) if predicted else 0.0
        recall = len(tp) / len(ground_truth) if ground_truth else 0.0
        f1 = (
            2 * precision * recall / (precision + recall)
            if (precision + recall) > 0
            else 0.0
        )

        return EvalMetrics(
            precision=precision,
            recall=recall,
            f1=f1,
            true_positives=tp,
            false_positives=fp,
            false_negatives=fn,
        )

    @classmethod
    def evaluate_against_ground_truth(
        cls,
        ner_profile: SkillProfile,
        gt_hard: set[str],
        gt_soft: set[str],
    ) -> NERExtractionEval:
        """用手动标注的 ground truth 评估 NER 提取结果"""
        return NERExtractionEval(
            hard_metrics=cls._compute_metrics(ner_profile.hard_skills, gt_hard),
            soft_metrics=cls._compute_metrics(ner_profile.soft_skills, gt_soft),
        )

    @classmethod
    def evaluate_ner_vs_regular(
        cls,
        text: str,
        ner_extractor: NERSkillExtractor,
        regular_extractor: RegularSkillExtractor,
    ) -> NERExtractionEval:
        """以 Regular extractor 的结果作为 baseline 评估 NER"""
        ner_profile = ner_extractor.extract(text)
        regular_profile = regular_extractor.extract(text)

        return NERExtractionEval(
            hard_metrics=cls._compute_metrics(
                ner_profile.hard_skills, regular_profile.hard_skills
            ),
            soft_metrics=cls._compute_metrics(
                ner_profile.soft_skills, regular_profile.soft_skills
            ),
        )
