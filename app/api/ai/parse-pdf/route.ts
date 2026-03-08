// app/api/ai/parse-pdf/route.ts
import { success, error } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Ollama } from 'ollama';
import pythonClient from '@/lib/python-client';
import { NextResponse } from 'next/server';

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gpt-oss:120b';
const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL ?? 'https://ollama.com',
  headers: { Authorization: `Bearer ${process.env.OLLAMA_API_KEY ?? ''}` },
});

// 复制 analyze 的系统提示词逻辑，但针对解析任务进行优化
const PARSE_SYSTEM_PROMPT = `You are an expert resume parser. 
Extract info from text and return ONLY valid JSON matching, flowing this structure:
1. education must includes:
   - university
   - major
   - location
   - date 
   - summary

2. experience must includes:
   - company
   - position
   - location
   - date
   - summary

3. skills must includes:
   - name
   - level (beginner/intermediate/advanced)
   - keywords (array of related keywords)

4. projects must includes:
   - name
   - description
   - date

The JSON should be in this format:
{
  "basics": { "name": "", "email": "", "phone": "", "location": "", "website": "", "headline": "" },
  "modules": { "education": { "items": [] }, "experience": { "items": [] }, "projects": { "items": [] }, "skills": { "items": [] } }
}`;

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return error('Unauthorized', 401);

    const formData = await req.formData();
    
    // ✅ 正确做法：通过 HTTP 访问已启动的 Python 服务，而不是直接加载文件
    const pythonRes = await pythonClient.post('/api/resume/parse-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    const { extracted_text } = pythonRes.data;

    // 模仿 analyze 的 ollama 调用
    const aiRes = await ollama.chat({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: PARSE_SYSTEM_PROMPT },
        { role: 'user', content: `Parse this resume text:\n${extracted_text}` },
      ],
    });

    const content = aiRes.message.content?.replace(/```json|```/g, '').trim() || '{}';
    const structuredData = JSON.parse(content);

    const sanitizedBasics = {
      name: String(structuredData.basics?.name || ''),
      email: String(structuredData.basics?.email || ''),
      phone: String(structuredData.basics?.phone || ''),
      location: String(structuredData.basics?.location || ''),
      headline: String(structuredData.basics?.headline || ''),
      picture: { url: '', size: 64 },
      customFields: [],
    };

    // 为列表项生成唯一 ID 并确保字段完整性
    const sanitizeItems = (items: any[]) => 
      (items || []).map((item) => ({
        id: crypto.randomUUID(), // 必须生成 ID 以供前端渲染 key
        visible: true, // 默认可见
        ...item,
        summary: String(item.summary || ''), // 确保 summary 是字符串
      }));

    // 7. 返回符合前端响应拦截器要求的格式
    return NextResponse.json({
      code: 0, // 必须是 0 才能匹配 ResponseCode.SUCCESS
      data: {
        title: sanitizedBasics.name ? `${sanitizedBasics.name}的简历` : '新简历',
        description: 'AI 从 PDF 自动解析生成',
        basics: sanitizedBasics,
        modules: {
          education: { 
            id: 'education', 
            name: 'Education', 
            visible: true, 
            items: sanitizeItems(structuredData.modules?.education?.items) 
          },
          experience: { 
            id: 'experience', 
            name: 'Experience', 
            visible: true, 
            items: sanitizeItems(structuredData.modules?.experience?.items) 
          },
          projects: { 
            id: 'projects', 
            name: 'Projects', 
            visible: true, 
            items: sanitizeItems(structuredData.modules?.projects?.items) 
          },
          skills: { 
            id: 'skills', 
            name: 'Skills', 
            visible: true, 
            items: (structuredData.modules?.skills?.items || []).map((skill: any) => ({
              id: crypto.randomUUID(),
              name: String(skill.name || ''),
              level: String(skill.level || ''),
              keywords: Array.isArray(skill.keywords) ? skill.keywords.map(String) : [],
            })) 
          },
        }
      },
      msg: 'Success'
    });
  } catch (err: any) {
  // 强制在终端打印出详细错误堆栈
    console.error('--- DEBUG: PARSE PDF FAILED ---');
    console.error(err); 
    if (err.response) console.error('Python Response:', err.response.data);
    console.error('-------------------------------');
    
    return error(err.message || 'Internal server error', 500);
  }
}