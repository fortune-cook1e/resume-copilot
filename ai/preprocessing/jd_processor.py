import pandas as pd
from typing import List, Set
from models.schemas import Job
from preprocessing.utils import normalize_skill
import re


class JDProcessor:

    def __init__(self, filepath: str):
        self.filepath = filepath

    def load(self) -> List[Job]:
        df = pd.read_csv(self.filepath)
        jobs = []

        for _, row in df.iterrows():
            job = self.process_job(row)
            jobs.append(job)

        return jobs

    def process_job(self, row) -> Job:
        skills = self.extract_skills(row["Skills"])
        required_years = self.extract_years(row["YearsOfExperience"])
        text = self.build_text_representation(row)

        return Job(
            id=row["JobID"],
            skills=skills,
            required_years=required_years,
            text=text,
        )

    def extract_skills(self, skills_str: str) -> Set[str]:
        if pd.isna(skills_str):
            return set()

        skills = [
            normalize_skill(skill)
            for skill in skills_str.split(";")
        ]

        return set(skills)

    def extract_years(self, years_str: str) -> float:
        if not isinstance(years_str, str):
            return 0.0

        years_str = years_str.lower().strip()

        # 处理 fresher
        if "fresher" in years_str:
            return 0.0

        # 提取所有数字
        numbers = re.findall(r"\d+", years_str)

        if not numbers:
            return 0.0

        numbers = [float(n) for n in numbers]

        # 如果是区间，例如 1-3 years → 取上限
        if "-" in years_str and len(numbers) >= 2:
            return numbers[1]

        # 如果是 5+ years → 取第一个数字
        return numbers[0]

    def build_text_representation(self, row) -> str:
        parts = [
            str(row.get("Title", "")),
            str(row.get("Responsibilities", "")),
            str(row.get("Skills", "")),
            str(row.get("Keywords", "")),
        ]

        return " ".join(parts)