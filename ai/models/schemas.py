from dataclasses import dataclass
from typing import Set


@dataclass
class Candidate:
    id: str
    skills: Set[str]
    years_of_experience: float
    text: str


@dataclass
class Job:
    id: str
    skills: Set[str]
    required_years: float
    text: str