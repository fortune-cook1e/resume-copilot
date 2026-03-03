# ai/matching/matcher.py


class Matcher:
    def __init__(
        self,
        semantic_matcher=None,
        skill_weight=0.5,
        exp_weight=0.2,
        semantic_weight=0.3,
    ):
        self.semantic_matcher = semantic_matcher
        self.skill_weight = skill_weight
        self.exp_weight = exp_weight
        self.semantic_weight = semantic_weight

    # --------------------------
    # Skill Matching
    # --------------------------
    def skill_score(self, resume, job):
        if not job.skills:
            return 0.0
        return len(resume.skills & job.skills) / len(job.skills)

    def experience_score(self, resume, job):
        if job.required_years == 0:
            return 1.0
        return min(resume.years_of_experience / job.required_years, 1.0)

    def final_score(self, resume, job):
        skill = self.skill_score(resume, job)
        exp = self.experience_score(resume, job)

        semantic = 0
        if self.semantic_matcher:
            semantic = self.semantic_matcher.semantic_score(resume, job)

        return (
            self.skill_weight * skill
            + self.exp_weight * exp
            + self.semantic_weight * semantic
        )

    # --------------------------
    # Rank All Jobs
    # --------------------------
    def rank_jobs(self, resume, jobs):
        results = []

        for job in jobs:
            score = self.final_score(resume, job)
            results.append((job.id, score))

        results.sort(key=lambda x: x[1], reverse=True)
        return results

    def explain(self, resume, job):
        matched_skills = resume.skills & job.skills
        missing_skills = job.skills - resume.skills

        return {
            "matched_skills": list(matched_skills),
            "missing_skills": list(missing_skills),
            "skill_score": self.skill_score(resume, job),
            "experience_score": self.experience_score(resume, job),
            "final_score": self.final_score(resume, job),
        }
