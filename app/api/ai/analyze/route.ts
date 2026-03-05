import axios from 'axios';
import { Ollama } from 'ollama';
import { success, error } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { resume } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import type { ResumeData } from '@/types/resume';
import { extractSkills, extractYears, buildResumeText } from '@/lib/job-parse';
import pythonClient from '@/lib/python-client';

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gpt-oss:120b';

const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL ?? 'https://ollama.com',
  headers: {
    Authorization: `Bearer ${process.env.OLLAMA_API_KEY ?? ''}`,
  },
});

const SUGGESTION_SYSTEM_PROMPT = `You are an expert career coach and resume consultant.
Given a job description and the candidate's resume text, provide concise, actionable suggestions
on how the candidate can better tailor their resume to match the job requirements.

Guidelines:
- Highlight the most important skill gaps or missing keywords
- Suggest specific improvements to experience/project descriptions
- Keep suggestions focused and numbered (3–5 points max)
- Be direct and practical — no filler text
- Respond in the same language as the job description`;

export interface ParseJobRequest {
  job_description: string; // Example:
  resume_id: string; // required: used to fetch resume and compute match score
}

// Todo: for test: https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4353932501
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return error('Unauthorized', 401);
    }

    const body = (await req.json()) as ParseJobRequest;
    const { job_description, resume_id } = body;

    if (!job_description?.trim()) {
      return error('job_description is required', 400);
    }
    if (!resume_id?.trim()) {
      return error('resume_id is required', 400);
    }

    const [found] = await db
      .select()
      .from(resume)
      .where(and(eq(resume.id, resume_id), eq(resume.userId, session.user.id)));

    if (!found) {
      return error('Resume not found', 404);
    }

    const resumeData = found.data as unknown as ResumeData;
    const resumeText = buildResumeText(resumeData);

    const payload = {
      job_description: job_description.trim(),
      resume_id,
      resume_skills: extractSkills(resumeData),
      resume_years: extractYears(resumeData),
      resume_text: resumeText,
    };

    // Run Python matching + Ollama suggestion in parallel
    const [matchSettled, aiSettled] = await Promise.allSettled([
      pythonClient.post('/api/resume/analyze', payload),
      ollama.chat({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: SUGGESTION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Job Description:\n${job_description.trim()}\n\nMy Resume:\n${resumeText}`,
          },
        ],
      }),
    ]);

    const matchResult = matchSettled.status === 'fulfilled' ? matchSettled.value.data : null;
    const ai_suggestions =
      aiSettled.status === 'fulfilled' ? (aiSettled.value.message.content?.trim() ?? null) : null;

    return success({ ...(matchResult as object), ai_suggestions });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('Python service error:', err.response?.status, err.response?.data);
      return error(`Python service error: ${err.response?.status ?? 'unreachable'}`, 502);
    }
    console.error('Job parse error:', err);
    return error('Internal server error', 500);
  }
}
