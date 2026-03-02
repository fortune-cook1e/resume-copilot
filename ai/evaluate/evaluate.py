from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# 加载超小模型（80MB）
model = SentenceTransformer("all-MiniLM-L6-v2")


def compute_similarity(text1, text2):
    emb1 = model.encode([text1])
    emb2 = model.encode([text2])

    score = cosine_similarity(emb1, emb2)[0][0]
    return float(score)


def evaluate_resume(original_resume, rewritten_resume, job_description):
    original_score = compute_similarity(original_resume, job_description)
    rewritten_score = compute_similarity(rewritten_resume, job_description)

    improvement = rewritten_score - original_score

    return {
        "original_score": round(original_score, 4),
        "rewritten_score": round(rewritten_score, 4),
        "improvement": round(improvement, 4),
        "success": rewritten_score > original_score,
    }


# 示例
if __name__ == "__main__":
    resume = """
    Frontend engineer with 5 years of experience in React and TypeScript.
    """

    rewritten = """
    Frontend engineer with 5 years of experience in React, TypeScript, 
    performance optimization, REST API integration, and scalable web architecture.
    """

    jd = """
    We are looking for a React developer with strong experience in performance optimization,
    API integration, and scalable system design.
    """

    result = evaluate_resume(resume, rewritten, jd)
    print(result)
