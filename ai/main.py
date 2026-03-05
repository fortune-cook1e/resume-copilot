from llm.rewriter import ResumeRewriter
from matching.matcher import Matcher
from matching.semantic_matcher import SemanticMatcher
from preprocessing.jd_processor import JDProcessor
from preprocessing.resume_processor import ResumeProcessor

if __name__ == "__main__":
    # Step1: Processing dataset
    resume_processor = ResumeProcessor("datasets/resumes.jsonl")
    jd_processor = JDProcessor("datasets/jobs.csv")

    resumes = resume_processor.load()
    jobs = jd_processor.load()

    # Step2: Matching
    sample_resume = resumes[0]

    semantic_matcher = SemanticMatcher()
    matcher = Matcher(
        semantic_matcher=semantic_matcher,
        skill_weight=0.5,
        exp_weight=0.2,
        semantic_weight=0.3,
    )

    # Step3: Rewriting
    rewriter = ResumeRewriter()
    print("\n=== Original Resume ===\n")
    print(sample_resume.text)
    print("\n=== Job Description ===\n")
    print(jobs[1].text)
    improved = rewriter.rewrite(sample_resume.text, jobs[0].text)
