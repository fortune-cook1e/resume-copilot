import sys
from pathlib import Path

# 确保 ai/ 目录在模块搜索路径中（无论从哪个目录执行都有效）
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from extractor.skill import HybridSkillExtractor, NERSkillExtractor, RegularSkillExtractor

job_text_1 = """
About the job We're Hiring: Full Stack Developer (Hybrid Stockholm) Ethira is building the future of third party risk management. 
We help organizations manage third-party risks, vendor assessments, and regulatory compliance through intelligent automation. 
What you'll work with: Backend: TypeScript / Node.js NestJS (domain-driven architecture) PostgreSQL with TypeORM Redis + BullMQ for queues LangChain + OpenAI for AI features WebSockets (Socket.io) 
Frontend: React with TypeScript Vite TailwindCSS + MUI / Shadcn TanStack Query React Hook Form + Zod 
Infrastructure: Docker Railway AWS S3 Sentry for observability 
What we're looking for: Strong TypeScript experience across the stack Comfortable with relational databases and ORMs Interest in AI/LLM integration Product mindset you care about what you build Based in or willing to relocate to Stockholm 
What we offer: Founding role with full ownership over features. Highly competitive salary for the Stockholm region. 1% of the company in qualified stock options (QESOs). 
Interested? Send a message or apply directly.
"""


regular_result = RegularSkillExtractor().extract(job_text_1)
ner_result = NERSkillExtractor().extract(job_text_1)
hybrid_result = HybridSkillExtractor().extract(job_text_1)

print("\n=== Regular (词库强匹配) ===")
print("hard skills:", sorted(regular_result.hard_skills))
print("soft skills:", sorted(regular_result.soft_skills))

print("\n=== NER (模型提取) ===")
print("hard skills:", sorted(ner_result.hard_skills))
print("soft skills:", sorted(ner_result.soft_skills))

print("\n=== Hybrid (词库 + NER) ===")
print("hard skills:", sorted(hybrid_result.hard_skills))
print("soft skills:", sorted(hybrid_result.soft_skills))
