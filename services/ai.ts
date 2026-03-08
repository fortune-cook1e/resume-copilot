import request from '@/lib/request';

export interface PolishResult {
  polished: string;
}

export interface AnalyzeResult {
  job: {
    extracted_skills: string[];
    required_years: number;
    hard_skills: string[];
    soft_skills: string[];
  };
  match: {
    matched_skills: string[];
    missing_skills: string[];
    skill_score: number; // 0–1
    experience_score: number; // 0–1
    overall_score: number; // 0–1
    semantic_score: number; // 0–1
    final_score: number; // 0–1, weighted average of all factors
    // 细分 hard / soft
    matched_hard_skills: string[];
    missing_hard_skills: string[];
    hard_skill_score: number;
    matched_soft_skills: string[];
    missing_soft_skills: string[];
    soft_skill_score: number;
    resume_years: number;
    jd_required_years: number;
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

/** * 新增：PDF 解析结果的接口 
 * 对应 Python 后端的 ParsedResumeData 模型
 */
export interface ParsePdfResult {
  title: string;
  description: string;
  extracted_text: string;
}

/** * 新增：调用后端解析 PDF 的函数
 * 使用 FormData 处理文件上传
 */
export async function parseResumePdf(file: File): Promise<ParsePdfResult> {
  const formData = new FormData();
  formData.append('file', file);

  // 注意：这里路径设为 '/ai/parse-pdf' 以匹配你项目中 request 库的路径惯例
  const result = (await request.post('/ai/parse-pdf', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })) as unknown as ParsePdfResult;
  
  return result;
}
