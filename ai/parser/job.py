"""
Parse raw LinkedIn / general Job Description text into structured data.
Extracts: title, sections, skills, required_years of experience.
"""

import re
from typing import Optional

from model import ParsedJD

from parser.utils import load_skills, normalize_skill

# ---------------------------------------------------------------------------
# Common LinkedIn JD section headings (case-insensitive)
# ---------------------------------------------------------------------------
SECTION_HEADERS = [
    "about the job",
    "about the role",
    "about us",
    "about the team",
    "job description",
    "the role",
    "what you'll do",
    "what you will do",
    "responsibilities",
    "key responsibilities",
    "your role",
    "your responsibilities",
    "what you'll bring",
    "who you are",
    "what we're looking for",
    "qualifications",
    "requirements",
    "minimum qualifications",
    "preferred qualifications",
    "nice to have",
    "skills",
    "technical skills",
    "benefits",
    "what we offer",
    "perks",
]


COMMON_HARD_SKILLS = load_skills("hard")
COMMON_SOFT_SKILLS = load_skills("soft")

YEARS_PATTERNS = [
    r"(\d+)\+?\s*(?:to|-)\s*(\d+)\s*years?",  # 3-5 years / 3 to 5 years
    r"(\d+)\+\s*years?",  # 5+ years
    r"at least\s+(\d+)\s*years?",  # at least 3 years
    r"minimum\s+(?:of\s+)?(\d+)\s*years?",  # minimum of 3 years
    r"(\d+)\s*years?\s+of\s+experience",  # 3 years of experience
]


def _detect_section(line: str) -> Optional[str]:
    """Return normalised section name if line looks like a section header."""
    stripped = line.strip().rstrip(":").lower()
    for header in SECTION_HEADERS:
        if stripped == header or stripped.startswith(header):
            return header
    return None


def parse_sections(text: str) -> dict[str, str]:
    """Split raw text into named sections."""
    sections: dict[str, str] = {}
    current = "general"
    sections[current] = ""

    for line in text.splitlines():
        section = _detect_section(line)
        if section:
            current = section
            sections.setdefault(current, "")
        else:
            sections[current] = sections.get(current, "") + line + "\n"

    # Strip whitespace from all values
    return {k: v.strip() for k, v in sections.items() if v.strip()}


def extract_skills_from_text(text: str) -> tuple[set[str], set[str]]:
    """Extract known hard and soft skills mentioned in text.

    Returns:
        (hard_skills, soft_skills)
    """
    text_lower = text.lower()
    hard_found: set[str] = set()
    soft_found: set[str] = set()

    for skill in COMMON_HARD_SKILLS:
        pattern = r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])"
        if re.search(pattern, text_lower):
            hard_found.add(normalize_skill(skill))

    for skill in COMMON_SOFT_SKILLS:
        pattern = r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])"
        if re.search(pattern, text_lower):
            soft_found.add(normalize_skill(skill))

    return hard_found, soft_found


def extract_required_years(text: str) -> float:
    """Extract the maximum required years of experience from text."""
    text_lower = text.lower()
    max_years = 0.0

    for pattern in YEARS_PATTERNS:
        for match in re.finditer(pattern, text_lower):
            groups = [float(g) for g in match.groups() if g is not None]
            max_years = max(max_years, max(groups))

    return max_years


def parse_raw_jd(raw_text: str) -> ParsedJD:
    """
    Entry point: parse a raw LinkedIn JD string into a ParsedJD object.
    """
    text = raw_text.strip()

    # Attempt to extract title from first non-empty line
    lines = [l for l in text.splitlines() if l.strip()]
    title = lines[0].strip() if lines else ""

    sections = parse_sections(text)

    # Combine requirement-related sections for skill/year extraction
    requirement_keys = {
        "requirements",
        "qualifications",
        "minimum qualifications",
        "preferred qualifications",
        "who you are",
        "what we're looking for",
        "skills",
        "technical skills",
        "what you'll bring",
    }
    requirements_text = (
        "\n".join(v for k, v in sections.items() if k in requirement_keys) or text
    )  # fallback to full text if no requirement section found

    hard_skills, soft_skills = extract_skills_from_text(text)
    required_years = extract_required_years(
        requirements_text
    ) or extract_required_years(text)

    return ParsedJD(
        # raw_text=raw_text,
        # title=title,
        # sections=sections,
        # requirements_text=requirements_text,
        hard_skills=hard_skills,
        soft_skills=soft_skills,
        required_years=required_years,
    )
