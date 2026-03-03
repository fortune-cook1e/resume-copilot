import numpy as np
from sentence_transformers import SentenceTransformer


class SemanticMatcher:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        print("Loading embedding model...")
        self.model = SentenceTransformer(model_name)

    # --------------------------
    # Encode single text
    # --------------------------
    def encode(self, text: str):
        return self.model.encode(text, normalize_embeddings=True)

    # --------------------------
    # Cosine similarity
    # --------------------------
    def similarity(self, vec1, vec2):
        return float(np.dot(vec1, vec2))

    # --------------------------
    # Semantic score
    # --------------------------
    def semantic_score(self, resume, job):
        resume_vec = self.encode(resume.text)
        job_vec = self.encode(job.text)

        return self.similarity(resume_vec, job_vec)
