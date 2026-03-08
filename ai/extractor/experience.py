"""用正则从文本中提取工作年限并计算匹配分数。"""

import re


class ExperienceExtractor:
    _PATTERNS = [
        # "3-5 years" → 取上限
        re.compile(r"(\d+)\s*[-–to]+\s*(\d+)\s*\+?\s*years?", re.IGNORECASE),
        # "5+ years" / "5 years"
        re.compile(r"(\d+)\s*\+?\s*years?", re.IGNORECASE),
    ]

    @classmethod
    def extract_years(cls, text: str) -> float:
        """返回从文本中提取的最大年限数值，未找到返回 0.0"""
        if not text:
            return 0.0
        lower = text.lower()
        if "fresher" in lower or "entry level" in lower or "entry-level" in lower:
            return 0.0
        years: list[float] = []
        for pat in cls._PATTERNS:
            for m in pat.finditer(text):
                nums = [float(g) for g in m.groups() if g is not None]
                years.append(max(nums))
        return max(years) if years else 0.0

    @classmethod
    def experience_score(cls, resume_years: float, required_years: float) -> float:
        """
        年限匹配分数:
          - JD 没有要求 → 1.0
          - resume >= required → 1.0
          - resume < required → resume / required (线性衰减)
        """
        if required_years <= 0:
            return 1.0
        return min(resume_years / required_years, 1.0)
