

# ------2. NER----
from transformers import pipeline
import torch

class SkillExtractorNER:
    def __init__(self, model_name="dslim/bert-base-NER", skill_db=None):
        self.ner_pipeline = pipeline("ner", model=model_name, aggregation_strategy="simple")
        # 这里的 skill_db 是你从 JD 数据集里提取的所有技能去重后的列表
        self.skill_db = [s.lower() for s in skill_db] if skill_db else []

    def extract(self, text):
        if not text: return []
        
        # 1. 基础 NER 提取
        results = self.ner_pipeline(text)
        extracted = []
        for entity in results:
            # 降低一点阈值到 0.4，因为技术词在通用模型里分值通常不高
            if entity['score'] > 0.4 and entity['entity_group'] in ['ORG', 'MISC']:
                word = entity['word'].strip().lower()
                # 过滤掉 ## 开头的碎片和单字符（除非是 C, R 这种语言）
                if not word.startswith('##') and (len(word) > 1 or word in ['c', 'r', 'q']):
                    extracted.append(word)

        # 2. 词库增强 (核心！)
        # 直接在文本里搜索我们已知的技能词
        text_lower = text.lower()
        for skill in self.skill_db:
            # 使用正则确保是单词匹配，防止 'c' 匹配到 'cat'
            if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
                extracted.append(skill)
        
        return list(set(extracted))
        
extractor = SkillExtractorNER("dslim/bert-base-NER")