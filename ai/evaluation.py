import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import gradio as gr
import pandas as pd
from extractor import HybridSkillExtractor, NERSkillExtractor, RegularSkillExtractor
from matcher import ResumeJDMatcher
from scorer import JobBERTSemanticScorer

DEFAULT_JD_TEXT = """
About the job We're Hiring: Full Stack Developer (Hybrid Stockholm) Ethira is building the future of third party risk management.
We help organizations manage third-party risks, vendor assessments, and regulatory compliance through intelligent automation.
What you'll work with: Backend: TypeScript / Node.js NestJS (domain-driven architecture) PostgreSQL with TypeORM Redis + BullMQ for queues LangChain + OpenAI for AI features WebSockets (Socket.io)
Frontend: React with TypeScript Vite TailwindCSS + MUI / Shadcn TanStack Query React Hook Form + Zod
Infrastructure: Docker Railway AWS S3 Sentry for observability
What we're looking for: Strong TypeScript experience across the stack Comfortable with relational databases and ORMs Interest in AI/LLM integration Product mindset you care about what you build Based in or willing to relocate to Stockholm
What we offer: Founding role with full ownership over features. Highly competitive salary for the Stockholm region. 1% of the company in qualified stock options (QESOs).
Interested? Send a message or apply directly.
""".strip()

DEFAULT_RESUME_TEXT = """
Full Stack Developer with 4 years of experience.
Proficient in TypeScript, React, Node.js, PostgreSQL, and Docker.
Built real-time features with WebSockets and Redis.
Experienced with CI/CD pipelines (GitHub Actions), AWS S3, and Sentry.
Strong communication skills, collaborative team player, proactive problem solver.
""".strip()

_CACHED_RESOURCES: dict | None = None


def _compute_metrics(
    predicted: set[str], ground_truth: set[str]
) -> tuple[float, float, float]:
    if not predicted and not ground_truth:
        return 1.0, 1.0, 1.0
    tp = len(predicted & ground_truth)
    precision = tp / len(predicted) if predicted else 0.0
    recall = tp / len(ground_truth) if ground_truth else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )
    return precision, recall, f1


def _result_detail(result, jd_text: str, resume_text: str) -> dict:
    return {
        "jd_text": jd_text,
        "resume_text": resume_text,
        "jd_hard_skills": sorted(result.jd_profile.hard_skills),
        "jd_soft_skills": sorted(result.jd_profile.soft_skills),
        "resume_hard_skills": sorted(result.resume_profile.hard_skills),
        "resume_soft_skills": sorted(result.resume_profile.soft_skills),
        "matched_hard_skills": sorted(result.matched_hard),
        "missing_hard_skills": sorted(result.missing_hard),
        "matched_soft_skills": sorted(result.matched_soft),
        "missing_soft_skills": sorted(result.missing_soft),
        "scores": {
            "hard_skill_score": round(result.hard_skill_score, 4),
            "soft_skill_score": round(result.soft_skill_score, 4),
            "experience_score": round(result.experience_score, 4),
            "semantic_score": round(result.semantic_score, 4),
            "final_score": round(result.final_score, 4),
            "resume_years": round(result.resume_years, 2),
            "jd_required_years": round(result.jd_required_years, 2),
        },
    }


def _mode_explanation(mode: str) -> str:
    if mode == "Regular":
        return "Rule-based matching: stable, but may miss newer skills outside the dictionary."
    if mode == "NER":
        return "Model-based extraction: stronger recall, but can sometimes produce noisy merged phrases."
    return "Hybrid mode: rule-based baseline + model recovery, usually more balanced."


def _mode_summary_markdown(mode: str, result) -> str:
    hard_total = len(result.jd_profile.hard_skills)
    soft_total = len(result.jd_profile.soft_skills)
    hard_hit = len(result.matched_hard)
    soft_hit = len(result.matched_soft)
    missing_hard = ", ".join(sorted(result.missing_hard)[:8]) or "None"
    missing_soft = ", ".join(sorted(result.missing_soft)[:8]) or "None"

    return f"""### {mode}
{_mode_explanation(mode)}

- Overall match score: **{result.final_score:.1%}**
- Hard skill coverage: **{hard_hit}/{hard_total}** (score={result.hard_skill_score:.1%})
- Soft skill coverage: **{soft_hit}/{soft_total}** (score={result.soft_skill_score:.1%})
- Experience match: **{result.resume_years:.1f} / {result.jd_required_years:.1f} years** (score={result.experience_score:.1%})
- Main hard-skill gaps: `{missing_hard}`
- Main soft-skill gaps: `{missing_soft}`
"""


def _get_resources():
    global _CACHED_RESOURCES
    if _CACHED_RESOURCES is not None:
        return _CACHED_RESOURCES

    scorer = JobBERTSemanticScorer()
    regular_extractor = RegularSkillExtractor()
    ner_extractor = NERSkillExtractor()
    hybrid_extractor = HybridSkillExtractor(
        regular_extractor=regular_extractor,
        ner_extractor=ner_extractor,
    )

    _CACHED_RESOURCES = {
        "Regular": ResumeJDMatcher(extractor=regular_extractor, scorer=scorer),
        "NER": ResumeJDMatcher(extractor=ner_extractor, scorer=scorer),
        "Hybrid": ResumeJDMatcher(extractor=hybrid_extractor, scorer=scorer),
    }
    return _CACHED_RESOURCES


def evaluate_extractors(jd_text: str, resume_text: str):
    jd_text = (jd_text or "").strip()
    resume_text = (resume_text or "").strip()

    if not jd_text:
        empty_df = pd.DataFrame()
        return (
            "Please paste a JD first.",
            "No data to analyze yet.",
            empty_df,
            empty_df,
            "",
            {},
            "",
            {},
            "",
            {},
        )

    matchers = _get_resources()
    results = {
        mode: matcher.match(resume_text=resume_text, jd_text=jd_text)
        for mode, matcher in matchers.items()
    }

    ranking = sorted(
        results.items(), key=lambda item: item[1].final_score, reverse=True
    )
    winner_mode, winner_result = ranking[0]
    has_resume = bool(resume_text)

    if has_resume:
        quick_read = f"""
### Quick takeaway 
- Recommended mode: **{winner_mode}**
- Why: highest overall score (**{winner_result.final_score:.1%}**)
- Interpretation: {_mode_explanation(winner_mode)}

Start with the plain-language summaries below. If needed, check JSON details at the bottom.
"""
    else:
        quick_read = """
### JD-only mode
No resume was provided, so this compares JD extraction only and skips full match interpretation.
"""

    score_rows = []
    for mode, result in results.items():
        score_rows.append(
            {
                "Mode": mode,
                "Final(%)": round(result.final_score * 100, 1),
                "Hard Score(%)": round(result.hard_skill_score * 100, 1),
                "Soft Score(%)": round(result.soft_skill_score * 100, 1),
                "Exp Score(%)": round(result.experience_score * 100, 1),
                "Semantic(%)": round(result.semantic_score * 100, 1),
                "JD Hard #": len(result.jd_profile.hard_skills),
                "Resume Hard #": len(result.resume_profile.hard_skills),
                "Matched Hard #": len(result.matched_hard),
                "JD Soft #": len(result.jd_profile.soft_skills),
                "Resume Soft #": len(result.resume_profile.soft_skills),
                "Matched Soft #": len(result.matched_soft),
            }
        )
    score_df = pd.DataFrame(score_rows).sort_values(by="Final(%)", ascending=False)

    regular_result = results["Regular"]
    eval_rows = []
    for target in ("JD", "Resume"):
        regular_hard = (
            regular_result.jd_profile.hard_skills
            if target == "JD"
            else regular_result.resume_profile.hard_skills
        )
        regular_soft = (
            regular_result.jd_profile.soft_skills
            if target == "JD"
            else regular_result.resume_profile.soft_skills
        )
        for mode, result in results.items():
            mode_hard = (
                result.jd_profile.hard_skills
                if target == "JD"
                else result.resume_profile.hard_skills
            )
            mode_soft = (
                result.jd_profile.soft_skills
                if target == "JD"
                else result.resume_profile.soft_skills
            )
            hard_p, hard_r, hard_f1 = _compute_metrics(mode_hard, regular_hard)
            soft_p, soft_r, soft_f1 = _compute_metrics(mode_soft, regular_soft)
            eval_rows.append(
                {
                    "Target": target,
                    "Mode": mode,
                    "Hard P": round(hard_p, 4),
                    "Hard R": round(hard_r, 4),
                    "Hard F1": round(hard_f1, 4),
                    "Soft P": round(soft_p, 4),
                    "Soft R": round(soft_r, 4),
                    "Soft F1": round(soft_f1, 4),
                }
            )
    eval_df = pd.DataFrame(eval_rows)

    return (
        f"Analysis complete. Best mode: **{winner_mode}**",
        quick_read,
        score_df,
        eval_df,
        _mode_summary_markdown("Regular", results["Regular"]),
        _result_detail(results["Regular"], jd_text, resume_text),
        _mode_summary_markdown("NER", results["NER"]),
        _result_detail(results["NER"], jd_text, resume_text),
        _mode_summary_markdown("Hybrid", results["Hybrid"]),
        _result_detail(results["Hybrid"], jd_text, resume_text),
    )


with gr.Blocks(title="Extractor Evaluation Dashboard") as demo:
    gr.Markdown("# 3-Mode Skill Extraction Comparison ")
    gr.Markdown(
        """
### Steps
1. Paste the **Job Description (JD)** on the left  
2. Paste the **Resume** on the right (optional)  
3. Click **Start Analysis**, read the quick takeaway first, then review details  
"""
    )

    with gr.Row():
        jd_input = gr.Textbox(
            label="Step 1: Job Description (JD)",
            lines=14,
            value=DEFAULT_JD_TEXT,
            placeholder="Paste job description here...",
        )
        resume_input = gr.Textbox(
            label="Step 2: Resume (Optional)",
            lines=14,
            value=DEFAULT_RESUME_TEXT,
            placeholder="Paste resume here...",
        )

    run_btn = gr.Button("Step 3: Start Analysis", variant="primary")
    status_output = gr.Markdown()
    quick_read_output = gr.Markdown()

    with gr.Accordion("View score tables (raw data)", open=True):
        score_table = gr.Dataframe(
            label="Score comparison across 3 modes",
            interactive=False,
            wrap=True,
        )
        eval_table = gr.Dataframe(
            label="Extraction quality vs Regular baseline",
            interactive=False,
            wrap=True,
        )

    gr.Markdown("## Plain-language summary by mode")
    with gr.Tabs():
        with gr.Tab("Regular"):
            regular_summary = gr.Markdown()
            regular_json = gr.JSON(label="Regular details (advanced)")
        with gr.Tab("NER"):
            ner_summary = gr.Markdown()
            ner_json = gr.JSON(label="NER details (advanced)")
        with gr.Tab("Hybrid"):
            hybrid_summary = gr.Markdown()
            hybrid_json = gr.JSON(label="Hybrid details (advanced)")

    run_btn.click(
        fn=evaluate_extractors,
        inputs=[jd_input, resume_input],
        outputs=[
            status_output,
            quick_read_output,
            score_table,
            eval_table,
            regular_summary,
            regular_json,
            ner_summary,
            ner_json,
            hybrid_summary,
            hybrid_json,
        ],
    )

    gr.Examples(
        examples=[[DEFAULT_JD_TEXT, DEFAULT_RESUME_TEXT], [DEFAULT_JD_TEXT, ""]],
        inputs=[jd_input, resume_input],
    )

if __name__ == "__main__":
    demo.launch()
