from preprocessing.resume_processor import ResumeProcessor
from preprocessing.jd_processor import JDProcessor


if __name__ == "__main__":
    resume_processor = ResumeProcessor("datasets/resumes.jsonl")
    jd_processor = JDProcessor("datasets/jobs.csv")

    candidates = resume_processor.load()
    jobs = jd_processor.load()

    print("Loaded resumes:", len(candidates))
    print("Loaded jobs:", len(jobs))

    print("\nSample Resume:")
    print(candidates[0])

    print("\nSample Job:")
    print(jobs[0])