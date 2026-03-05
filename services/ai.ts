import request from '@/lib/request';

export interface PolishResult {
  polished: string;
}

export interface AnalyzeResult {
  job: {
    extracted_skills: string[];
    required_years: number;
  };
  match: {
    matched_skills: string[];
    missing_skills: string[];
    skill_score: number; // 0–1
    experience_score: number; // 0–1
    overall_score: number; // 0–1
    semantic_score: number; // 0–1
    final_score: number; // 0–1, weighted average of all factors
  };
  suggestions: string; // markdown string with actionable resume improvement suggestions
}

/** Send text to the AI polish endpoint and return the polished version */
export async function polishText(content: string): Promise<string> {
  const result = (await request.post('/ai/polish', { content })) as unknown as PolishResult;
  return result.polished;
}

export async function analyzeResume(
  jobDescription: string,
  resumeId: string,
): Promise<AnalyzeResult> {
  const payload = {
    job_description: jobDescription,
    resume_id: resumeId,
  };
  const result = (await request.post('/ai/analyze', payload)) as AnalyzeResult;
  return result;
}
