# from resume_ner import SkillExtractorNER

# # 1. 实例化类（第一次运行会下载模型，建议在稳定的网络下进行）
# # 我们这里使用之前讨论过的稳定模型 dslim/bert-base-NER
# extractor = SkillExtractorNER(model_name="dslim/bert-base-NER")

# # 2. 准备一段典型的简历或 JD 文本
# # 这里包含了一些隐藏的技能点：React, Node.js, AWS, Docker
# sample_resume_text = """
# Developed a full-stack web application using React and Node.js. 
# Deployed the service on AWS using Docker containers and managed 
# the CI/CD pipeline with GitHub Actions. Knowledge of SQL and NoSQL databases.
# """

# # 3. 执行提取
# print("--- 正在从文本中提取实体 ---")
# extracted_skills = extractor.extract(sample_resume_text)

# # 4. 查看结果
# print(f"原始文本: {sample_resume_text.strip()}")
# print(f"提取出的技能/实体: {extracted_skills}")

# # 5. 验证是否包含我们期望的关键词
# # 预期输出类似: ['react', 'node.js', 'aws', 'docker', 'sql', 'nosql', 'github'] 
# # (具体取决于模型的置信度和标签)

from ner2 import SkillExtractorJobBERT

test_text = "Experienced in developing RESTful APIs using Django and PostgreSQL. Familiar with Kubernetes and Docker."


extractor = SkillExtractorJobBERT()
extracted_skills = extractor.extract(test_text)

print(f"原始文本: {sample_resume_text.strip()}")
print(f"提取出的技能/实体: {extracted_skills}")

# 跑两个模型
# skills_general = extractor_general.extract(test_text)
# skills_job = extractor_job.extract(test_text)

# 在你的报告里写：
# "JobBERT 成功识别了 'RESTful APIs' 和 'Kubernetes'，而通用模型将其标记为 MISC 或漏掉。"