import csv as csv_mod
import re
from pathlib import Path
from typing import Literal

_DATASETS_DIR = Path(__file__).resolve().parent.parent / "datasets"

_SKILL_CONFIG: dict[str, tuple[str, str]] = {
    "hard": ("hard_skills.csv", "Skill Name"),
    "soft": ("soft_skills.csv", "Soft Skills"),
}


def load_skills(kind: Literal["hard", "soft"]) -> set[str]:
    """
    从 datasets/ 加载技能词库。

    参数:
        kind: "hard" → tech_skills.csv (Skill Name 列, 每行一个技能)
              "soft" → soft_skills.csv (Soft Skills 列, 逗号分隔多个技能)
    """
    filename, column = _SKILL_CONFIG[kind]
    csv_path = _DATASETS_DIR / filename
    skills: set[str] = set()
    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv_mod.DictReader(f)
            for row in reader:
                raw = row.get(column, "").strip()
                if not raw:
                    continue
                for part in raw.split(","):
                    name = part.strip().lower()
                    if name:
                        skills.add(name)
    except FileNotFoundError:
        print(f"⚠️  Skills CSV 未找到: {csv_path}")
    print(f"📦 Loaded {len(skills)} {kind} skills from {filename}")
    return skills


def clean_unknown(value):
    if isinstance(value, str):
        if value.strip().lower() in ["unknown", ""]:
            return None
    return value


def normalize_skill(skill: str) -> str:
    return skill.lower().strip()


def parse_duration(duration_str: str) -> float:
    """
    Convert duration like:
    - '6 months'
    - '2 years'
    into float (years)
    """
    if not duration_str:
        return 0.0

    duration_str = duration_str.lower()

    months_match = re.search(r"(\d+)\s*month", duration_str)
    years_match = re.search(r"(\d+)\s*year", duration_str)

    years = 0.0

    if years_match:
        years += float(years_match.group(1))

    if months_match:
        years += float(months_match.group(1)) / 12

    return years
