# from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
# import torch

# class SkillExtractorJobBERT:
#     def __init__(self, model_name="jjzha/jobbert-base-cased"):
#         print(f"🚀 正在加载 Job-Specific NER 模型: {model_name}...")
#         try:
#             # 自动检测设备
#             device = "mps" if torch.backends.mps.is_available() else (0 if torch.cuda.is_available() else -1)
            
#             # 这个模型专门针对技能提取进行了微调
#             self.ner_pipeline = pipeline(
#                 "ner", 
#                 model=model_name, 
#                 aggregation_strategy="simple",
#                 device=device
#             )
#             print("✅ JobBERT 技能提取器就绪！")
#         except Exception as e:
#             print(f"❌ 加载失败: {e}")

#     def extract(self, text):
#         if not text or len(text.strip()) < 10:
#             return []
        
#         results = self.ner_pipeline(text)
        
#         # JobBERT 专用模型的 Label 通常是 'LABEL_1' 或 'SKILL'
#         # 我们这里打印一下结果结构，方便调试
#         extracted_skills = []
#         for entity in results:
#             # 过滤高置信度实体
#             if entity['score'] > 0.5:
#                 word = entity['word'].strip().lower()
#                 # 排除噪音
#                 if len(word) > 1 or word in ['c', 'r', 'go']:
#                     extracted_skills.append(word)
        
#         return list(set(extracted_skills))

# # --- 实例化 ---
# # 注意：如果 jjzha/jobbert-base-cased 不能直接用，请改用微调版 jjzha/esc-skill-extraction
# extractor_job = SkillExtractorJobBERT()

import torch
import re
from transformers import AutoTokenizer, AutoModel
import torch.nn.functional as F

class JobBERTSkillExtractor:
    def __init__(self, model_name="jjzha/jobbert-base-cased", skill_db=None):
        """
        初始化：加载 JobBERT 基础模型并对技能词库进行预向量化
        """
        print(f"🛠️ 正在加载 JobBERT 基础模型: {model_name}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        
        # 自动选择设备 (Mac 用 mps, Nvidia 用 cuda, 否则 cpu)
        self.device = torch.device("mps" if torch.backends.mps.is_available() else 
                                  ("cuda" if torch.cuda.is_available() else "cpu"))
        self.model.to(self.device)
        
        # 预存清洗后的技能词库
        self.skill_db = skill_db if skill_db else []
        self.skill_embeddings = None
        
        if self.skill_db:
            print(f"📦 正在对 {len(self.skill_db)} 个技能进行向量化处理...")
            self.skill_embeddings = self._encode_texts(self.skill_db)

    def _encode_texts(self, texts):
        """将文本列表转换为 JobBERT 向量并归一化"""
        inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.model(**inputs)
            # 使用 Mean Pooling（均值池化）获取文本表征
            embeddings = outputs.last_hidden_state.mean(dim=1)
        return F.normalize(embeddings, p=2, dim=1)

    def extract(self, text, threshold=0.85):
        """
        提取逻辑：将输入文本切词，计算每个词与词库的语义相似度
        """
        if not text or not self.skill_db:
            return []

        # 1. 简单的分词清洗
        candidate_words = list(set(re.findall(r'\b\w+[.#\w]*\b', text)))
        if not candidate_words:
            return []

        # 2. 计算输入词的向量
        word_embeddings = self._encode_texts(candidate_words)

        # 3. 计算余弦相似度矩阵
        # Similarity = (Word_Embeddings) · (Skill_Embeddings)^T
        # 结果维度: [候选词数量, 词库技能数量]
        cos_sim_matrix = torch.mm(word_embeddings, self.skill_embeddings.t())

        extracted_results = []
        for i, word in enumerate(candidate_words):
            # 找到最相似的技能及其分数
            max_sim, idx = torch.max(cos_sim_matrix[i], dim=0)
            if max_sim.item() > threshold:
                extracted_results.append(self.skill_db[idx.item()])

        return sorted(list(set(extracted_results)))

# --- 使用示例 ---
# skill_db = ["python", "react", "amazon web services", "machine learning"]
extractor = JobBERTSkillExtractor()
found = extractor.extract("Developed AI models using Pyton and AWS cloud.")
print(found) # 即使拼写不完全一致，JobBERT 也能识别出 python 和 amazon web services