import gradio as gr
from extractor.skill import NERSkillExtractor

extractor = NERSkillExtractor()


job_text = """
About the job We're Hiring: Full Stack Developer (Hybrid Stockholm) Ethira is building the future of third party risk management. We help organizations manage third-party risks, vendor assessments, and regulatory compliance through intelligent automation. What you'll work with: Backend: TypeScript / Node.js NestJS (domain-driven architecture) PostgreSQL with TypeORM Redis + BullMQ for queues LangChain + OpenAI for AI features WebSockets (Socket.io) Frontend: React with TypeScript Vite TailwindCSS + MUI / Shadcn TanStack Query React Hook Form + Zod Infrastructure: Docker Railway AWS S3 Sentry for observability What we're looking for: Strong TypeScript experience across the stack Comfortable with relational databases and ORMs Interest in AI/LLM integration Product mindset you care about what you build Based in or willing to relocate to Stockholm What we offer: Founding role with full ownership over features. Highly competitive salary for the Stockholm region. 1% of the company in qualified stock options (QESOs). Interested? Send a message or apply directly.
"""

resume_text = """Full Stack Developer with experience in TypeScript, Node.js, React, and PostgreSQL. Skilled in building web applications and integrating AI features using LangChain and OpenAI. Proficient in using Docker for containerization and AWS S3 for cloud storage. Strong product mindset and a passion for developing high-quality software. Based in Stockholm and open to relocation. Seeking a challenging role in a dynamic company where I can contribute to building innovative solutions and grow my skills further."""


examples = [
    job_text,
    resume_text,
]


demo = gr.Interface(
    fn=extractor.ner,
    inputs=gr.Textbox(placeholder="Enter sentence here..."),
    outputs=["highlight", "highlight"],
    examples=examples,
)

demo.launch()
