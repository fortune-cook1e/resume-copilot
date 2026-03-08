"""
Skill extractors — two strategies with a shared interface.

  方案 A — RegularSkillExtractor: 关键词/正则匹配 (生产环境)
  方案 B — NERSkillExtractor:     双模型 token-classification (实验方案)
  方案 C — HybridSkillExtractor:  词库 + NER 融合
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod

import nltk
from model import SkillProfile
from parser.utils import load_skills
from transformers import pipeline

nltk.download("punkt_tab", quiet=True)


def split_skill_entities(entities: list[dict] | None) -> tuple[set[str], set[str]]:
    """
    将 NER entities 拆分为 (soft_skills, hard_skills) 两个集合。

    兼容字段:
      - entity: "Skill" / "Knowledge"
      - entity_group: "Skill" / "Knowledge"
    """
    soft_skills: set[str] = set()
    hard_skills: set[str] = set()

    if not entities:
        return soft_skills, hard_skills

    for entity in entities:
        if not isinstance(entity, dict):
            continue

        phrase = re.sub(r"\s+", " ", str(entity.get("word", "")).strip().lower())
        if not phrase or phrase.isnumeric():
            continue

        raw_tag = str(entity.get("entity") or entity.get("entity_group") or "").lower()
        tag = re.sub(r"[\s_-]+", "", raw_tag)

        if tag in {"skill", "softskill", "softskills", "soft"}:
            soft_skills.add(phrase)
        elif tag in {"knowledge", "hardskill", "hardskills", "hard"}:
            hard_skills.add(phrase)

    return soft_skills, hard_skills


_SKILL_STOPWORDS = {
    "a",
    "an",
    "and",
    "architecture",
    "backend",
    "feature",
    "features",
    "for",
    "frontend",
    "in",
    "infrastructure",
    "integration",
    "of",
    "on",
    "or",
    "stack",
    "the",
    "to",
    "with",
}


def normalize_skill_text(value: str) -> str:
    """通用技能文本规范化。"""
    text = value.strip().lower()
    text = re.sub(r"\s*\.\s*", ".", text)
    text = re.sub(r"\s*/\s*", "/", text)
    text = re.sub(r"\s*-\s*", "-", text)
    text = re.sub(r"\s*\+\s*", "+", text)
    text = re.sub(r"\s+", " ", text)
    return text


def canonical_skill_key(value: str) -> str:
    """
    通用 canonical key:
      - 去除空格、点、斜杠、连字符、下划线
      - 保留字母数字与 +/#（兼容 c++ / c#）
    """
    text = normalize_skill_text(value)
    text = re.sub(r"[ ./_-]+", "", text)
    text = re.sub(r"[^a-z0-9+#]", "", text)
    return text


def build_skill_lookup(
    skill_db: set[str],
) -> tuple[set[str], dict[str, set[str]], int]:
    """
    为通用技能匹配构建索引:
      - normalized_db: 规范化后的技能全集
      - canonical_map: canonical_key -> 原技能集合
      - max_terms: skill 中最大词数（供 n-gram 匹配）
    """
    normalized_db = {normalize_skill_text(skill) for skill in skill_db if skill.strip()}
    canonical_map: dict[str, set[str]] = {}
    max_terms = 1

    for skill in normalized_db:
        max_terms = max(max_terms, len(skill.split()))
        key = canonical_skill_key(skill)
        if key:
            canonical_map.setdefault(key, set()).add(skill)

    return normalized_db, canonical_map, max_terms


def extract_known_skills_from_phrases(
    phrases: set[str],
    normalized_db: set[str],
    canonical_map: dict[str, set[str]],
    max_terms: int,
) -> set[str]:
    """
    通用短语回收:
      1. 规范化短语
      2. 切词并做 n-gram 扫描
      3. exact / canonical 双通道匹配到词库技能
    """
    if not phrases:
        return set()

    found: set[str] = set()
    scan_terms = max(1, min(max_terms, 6))

    for phrase in phrases:
        normalized_phrase = normalize_skill_text(phrase)
        if not normalized_phrase:
            continue

        full_key = canonical_skill_key(normalized_phrase)
        if normalized_phrase in normalized_db:
            found.add(normalized_phrase)
        if full_key in canonical_map:
            found |= canonical_map[full_key]

        chunk_text = re.sub(r"[,:;|()]+", " ", normalized_phrase)
        tokens = [
            token
            for token in chunk_text.split()
            if token and token not in _SKILL_STOPWORDS
        ]
        if not tokens:
            continue

        for i in range(len(tokens)):
            for n in range(1, scan_terms + 1):
                if i + n > len(tokens):
                    break
                candidate = " ".join(tokens[i : i + n])
                if candidate in normalized_db:
                    found.add(candidate)
                key = canonical_skill_key(candidate)
                if key in canonical_map:
                    found |= canonical_map[key]

    return found


def dedupe_specific_skills(skills: set[str]) -> set[str]:
    """
    通用去重:
      - canonical 等价词保留更具体项（词数更多）
      - 若存在前缀多词技能，去掉单词技能（aws -> aws s3）
    """
    if not skills:
        return set()

    normalized = {normalize_skill_text(skill) for skill in skills if skill.strip()}
    canonical_groups: dict[str, set[str]] = {}
    for skill in normalized:
        canonical_groups.setdefault(canonical_skill_key(skill), set()).add(skill)

    resolved: set[str] = set()
    for group in canonical_groups.values():
        best = max(group, key=lambda value: (len(value.split()), len(value)))
        resolved.add(best)

    deduped = set(resolved)
    for skill in list(deduped):
        if len(skill.split()) != 1 or len(skill) < 3:
            continue
        prefix = skill + " "
        if any(other != skill and other.startswith(prefix) for other in deduped):
            deduped.discard(skill)

    return deduped


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Base
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class BaseSkillExtractor(ABC):
    """所有 extractor 的统一接口"""

    @abstractmethod
    def extract(self, text: str) -> SkillProfile: ...


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  方案 A — Regular Extractor (关键词匹配, 生产环境)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class RegularSkillExtractor(BaseSkillExtractor):
    """
    基于关键词词库的技能提取 (生产环境方案)
    - Hard skills: tech_skills.csv 词库 word-boundary 匹配
    - Soft skills: 默认 soft skills 列表匹配
    """

    def __init__(
        self,
        hard_skills_db: set[str] | None = None,
        soft_skills_db: set[str] | None = None,
    ):
        self.hard_db = hard_skills_db or load_skills("hard")
        self.soft_db = soft_skills_db or load_skills("soft")
        print(
            f"📦 Regular Extractor: {len(self.hard_db)} hard skills, "
            f"{len(self.soft_db)} soft skills"
        )

    def _keyword_match(self, text: str, skill_db: set[str]) -> set[str]:
        text_lower = text.lower()
        found: set[str] = set()
        for skill in skill_db:
            pattern = r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])"
            if re.search(pattern, text_lower):
                found.add(skill)
        return found

    def extract(self, text: str) -> SkillProfile:
        return SkillProfile(
            hard_skills=self._keyword_match(text, self.hard_db),
            soft_skills=self._keyword_match(text, self.soft_db),
        )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  方案 B — NER Extractor (双模型推理, 实验方案)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class NERSkillExtractor(BaseSkillExtractor):
    """
    使用两个 token-classification pipeline:
      - jjzha/jobbert_skill_extraction     → soft skills
      - jjzha/jobbert_knowledge_extraction → hard skills
    按句子拆分输入，逐句推理后用字符位置合并相邻实体（与官方 demo 一致）。
    """

    def __init__(self):
        print("🚀 NER: 加载 soft skill model (jjzha/jobbert_skill_extraction) ...")
        self.soft_skill_pipe = pipeline(
            "token-classification",
            model="jjzha/jobbert_skill_extraction",
            aggregation_strategy="first",
        )
        print("🚀 NER: 加载 hard skill model (jjzha/jobbert_knowledge_extraction) ...")
        self.hard_skill_pipe = pipeline(
            "token-classification",
            model="jjzha/jobbert_knowledge_extraction",
            aggregation_strategy="first",
        )

    @staticmethod
    def _aggregate_span(results: list[dict]) -> list[dict]:
        """
        用字符位置合并相邻实体 (与 HF demo 的 aggregate_span 一致)。
        如果两个实体在原文中仅间隔 1 个字符（空格），直接拼接为一个 span。
        """
        if not results:
            return []
        new_results = []
        current = results[0]
        for result in results[1:]:
            if result["start"] == current["end"] + 1:
                current["word"] += " " + result["word"]
                current["end"] = result["end"]
            else:
                new_results.append(current)
                current = result
        new_results.append(current)
        return new_results

    def _extract_from_pipe(self, pipe, text: str) -> set[str]:
        """逐句推理 + aggregate_span 合并，返回技能集合。"""
        sentences = nltk.sent_tokenize(text)
        skills: set[str] = set()
        for sent in sentences:
            results = pipe(sent)
            if results:
                spans = self._aggregate_span(results)
                for span in spans:
                    phrase = span["word"].strip().lower()
                    if len(phrase) > 1:
                        skills.add(phrase)
        return skills

    @staticmethod
    def _sentence_chunks(text: str) -> list[tuple[str, int]]:
        """
        将文本拆成句子并保留每句在原文中的起始偏移。
        """
        chunks: list[tuple[str, int]] = []
        cursor = 0
        for sentence in nltk.sent_tokenize(text):
            start = text.find(sentence, cursor)
            if start < 0:
                start = cursor
            chunks.append((sentence, start))
            cursor = start + len(sentence)
        return chunks

    def _ner_entities_from_pipe(self, pipe, text: str, entity_name: str) -> list[dict]:
        """
        逐句执行 NER 并返回带全局偏移的 entities，避免长文本截断。
        """
        entities: list[dict] = []
        for sentence, sentence_offset in self._sentence_chunks(text):
            results = pipe(sentence) or []
            if not results:
                continue
            spans = self._aggregate_span(results)
            for span in spans:
                item = dict(span)
                item["entity"] = entity_name
                item.pop("entity_group", None)
                if isinstance(item.get("start"), int):
                    item["start"] = item["start"] + sentence_offset
                if isinstance(item.get("end"), int):
                    item["end"] = item["end"] + sentence_offset
                entities.append(item)
        return entities

    def ner(self, text: str | None = None):
        text = text or ""
        output_skills = self._ner_entities_from_pipe(
            self.soft_skill_pipe, text, "Skill"
        )
        output_knowledge = self._ner_entities_from_pipe(
            self.hard_skill_pipe, text, "Knowledge"
        )

        return {"text": text, "entities": output_skills}, {
            "text": text,
            "entities": output_knowledge,
        }

    def extract_from_entities(self, entities: list[dict] | None) -> SkillProfile:
        """
        基于 NER 输出 entities 提取 soft/hard skills 集合。
        """
        soft_skills, hard_skills = split_skill_entities(entities)
        return SkillProfile(hard_skills=hard_skills, soft_skills=soft_skills)

    def extract_from_ner_entities(self, text: str) -> SkillProfile:
        """
        调用 ner() 后，基于返回 entities 生成 SkillProfile。
        """
        soft_result, hard_result = self.ner(text)
        merged_entities = [
            *(soft_result.get("entities") or []),
            *(hard_result.get("entities") or []),
        ]
        return self.extract_from_entities(merged_entities)

    def extract(self, text: str) -> SkillProfile:
        return self.extract_from_ner_entities(text)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  方案 C — Hybrid Extractor (词库 + NER 融合)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class HybridSkillExtractor(BaseSkillExtractor):
    """
    融合策略:
      - hard skills = Regular hard ∪ NER hard 的词库回收结果(通用方法)
      - soft skills = Regular soft ∪ NER soft
    """

    def __init__(
        self,
        regular_extractor: RegularSkillExtractor | None = None,
        ner_extractor: NERSkillExtractor | None = None,
    ):
        self.regular = regular_extractor or RegularSkillExtractor()
        self.ner = ner_extractor or NERSkillExtractor()
        (
            self._hard_normalized_db,
            self._hard_canonical_map,
            self._hard_max_terms,
        ) = build_skill_lookup(self.regular.hard_db)
        print("🤝 Hybrid Extractor: merge regular + ner")

    def extract(self, text: str) -> SkillProfile:
        regular_profile = self.regular.extract(text)
        ner_profile = self.ner.extract(text)
        recovered_hard_skills = extract_known_skills_from_phrases(
            ner_profile.hard_skills,
            normalized_db=self._hard_normalized_db,
            canonical_map=self._hard_canonical_map,
            max_terms=self._hard_max_terms,
        )
        hard_skills = dedupe_specific_skills(
            regular_profile.hard_skills | recovered_hard_skills
        )

        return SkillProfile(
            hard_skills=hard_skills,
            soft_skills=regular_profile.soft_skills | ner_profile.soft_skills,
        )
