"""
JobBERT Semantic Scorer — jjzha/jobbert-base-cased

招聘领域 BERT base (MLM 预训练, 无 NER 头)
用于提取文本 embedding 并计算余弦相似度。
"""

import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer


class JobBERTSemanticScorer:
    MODEL_NAME = "jjzha/jobbert-base-cased"

    def __init__(self):
        print(f"🚀 加载语义模型: {self.MODEL_NAME} ...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)
        self.model = AutoModel.from_pretrained(self.MODEL_NAME)
        self.device = torch.device(
            "mps" if torch.backends.mps.is_available() else "cpu"
        )
        self.model.to(self.device).eval()

    def _embed(self, text: str) -> torch.Tensor:
        """L2-normalised mean-pool embedding, shape [1, H]"""
        inputs = self.tokenizer(
            text, padding=True, truncation=True, max_length=512, return_tensors="pt"
        ).to(self.device)
        with torch.no_grad():
            outputs = self.model(**inputs)
        vec = outputs.last_hidden_state.mean(dim=1)
        return F.normalize(vec, p=2, dim=1)

    def score(self, text_a: str, text_b: str) -> float:
        """返回两段文本的余弦相似度 [0, 1]"""
        vec_a = self._embed(text_a)
        vec_b = self._embed(text_b)
        return float(torch.mm(vec_a, vec_b.t()).item())
