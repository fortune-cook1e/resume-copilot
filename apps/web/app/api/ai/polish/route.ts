import { success, error } from '@/lib/api-response';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Ollama } from 'ollama';

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'gpt-oss:120b';

const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL ?? 'https://ollama.com',
  headers: {
    Authorization: `Bearer ${process.env.OLLAMA_API_KEY ?? ''}`,
  },
});

const POLISH_SYSTEM_PROMPT = `You are a professional resume writer. Your task is to polish and improve the given resume text.

Guidelines:
- Improve clarity, conciseness, and professionalism
- Use strong action verbs
- Quantify achievements where possible
- Fix grammar and spelling errors
- Keep the original meaning and facts intact
- Return only the polished text, without any explanations or comments
- Preserve the original formatting (markdown, bullet points, etc.)`;

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return error('Unauthorized', 401);
    }

    const body = await req.json();
    const { content } = body as { content?: string };

    if (!content || !content.trim()) {
      return error('Content is required', 400);
    }

    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: 'system', content: POLISH_SYSTEM_PROMPT },
        { role: 'user', content: `Please polish the following resume text:\n\n${content}` },
      ],
    });

    const polished = response.message.content?.trim();
    if (!polished) {
      return error('AI returned empty response', 502);
    }

    return success({ polished });
  } catch (err) {
    console.error('AI polish error:', err);
    return error('Internal server error', 500);
  }
}
