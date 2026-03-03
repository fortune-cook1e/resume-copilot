import json
from typing import List, Set
from models.schemas import Candidate
from preprocessing.utils import clean_unknown, normalize_skill, parse_duration


class ResumeProcessor:

    def __init__(self, filepath: str):
        self.filepath = filepath

    def load(self) -> List[Candidate]:
        candidates = []

        with open(self.filepath, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                raw = json.loads(line)
                candidate = self.process_resume(raw, str(idx))
                candidates.append(candidate)

        return candidates

    def process_resume(self, raw: dict, candidate_id: str) -> Candidate:
        skills = self.extract_skills(raw)
        years = self.extract_years(raw)
        text = self.build_text_representation(raw)

        return Candidate(
            id=candidate_id,
            skills=skills,
            years_of_experience=years,
            text=text,
        )

    def extract_skills(self, raw: dict) -> Set[str]:
        skill_set = set()

        technical = raw.get("skills", {}).get("technical", {})

        for category in technical.values():
            if isinstance(category, list):
                for item in category:
                    name = clean_unknown(item.get("name"))
                    if name:
                        skill_set.add(normalize_skill(name))

        # 从 experience 里抽技术环境
        # Todo: 这里应该还要增加
        experiences = raw.get("experience", [])
        for exp in experiences:
            tech_env = exp.get("technical_environment", {})
            technologies = tech_env.get("technologies", [])
            for tech in technologies:
                tech = clean_unknown(tech)
                if tech:
                    skill_set.add(normalize_skill(tech))

        return skill_set

    def extract_years(self, raw: dict) -> float:
        total_years = 0.0
        experiences = raw.get("experience", [])

        for exp in experiences:
            duration = exp.get("dates", {}).get("duration")
            duration = clean_unknown(duration)
            total_years += parse_duration(duration)

        return total_years

    def build_text_representation(self, raw: dict) -> str:
        texts = []

        summary = raw.get("personal_info", {}).get("summary")
        summary = clean_unknown(summary)
        if summary:
            texts.append(summary)

        for exp in raw.get("experience", []):
            responsibilities = exp.get("responsibilities", [])
            texts.extend(responsibilities)

        for project in raw.get("projects", []):
            desc = clean_unknown(project.get("description"))
            if desc:
                texts.append(desc)

        return " ".join(texts)