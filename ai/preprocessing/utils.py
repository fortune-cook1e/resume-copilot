import re


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