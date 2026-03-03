import request from '@/lib/request';

export interface PolishResult {
  polished: string;
}

/** Send text to the AI polish endpoint and return the polished version */
export async function polishText(content: string): Promise<string> {
  const result = (await request.post('/ai/resume/polish', { content })) as unknown as PolishResult;
  return result.polished;
}
