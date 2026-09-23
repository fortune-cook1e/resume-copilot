import { AxiosError, type AxiosAdapter } from 'axios';
import { describe, expect, it } from 'vitest';
import request from '@/lib/request';

const reply = (status: number, data: unknown): AxiosAdapter => async config => {
  const response = { config, status, statusText: 'Response', headers: { 'x-request-id': 'req-123' }, data };
  if (status >= 400) throw new AxiosError('raw transport message', 'ERR_BAD_RESPONSE', config, undefined, response);
  return response;
};

describe('new business response client', () => {
  it('returns only the data in a successful response, including paged results', async () => {
    const adapter: AxiosAdapter = async config => ({
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { data: { items: [], pager: { page: 3, pageSize: 20, total: 41 } }, error: null },
    });

    expect(await request.get('/resumes', { adapter })).toEqual({
      items: [], pager: { page: 3, pageSize: 20, total: 41 },
    });
    expect(await request.get('/empty', { adapter: reply(200, { data: null, error: null }) })).toBeNull();
  });

  it('rejects a 401 with a stable code, real status and request ID instead of redirecting', async () => {
    await expect(request.get('/me', {
      adapter: reply(401, { data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }),
    })).rejects.toMatchObject({
      name: 'ApiRequestError', code: 'UNAUTHORIZED', status: 401, message: 'Unauthorized', requestId: 'req-123',
    });
  });

  it('does not show raw transport errors or trust malformed success payloads', async () => {
    await expect(request.get('/broken', { adapter: reply(500, { trace: 'secret' }) }))
      .rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 500, message: 'Invalid server response' });
    await expect(request.get('/broken', { adapter: reply(200, { code: 0, msg: 'old', data: 'old' }) }))
      .rejects.toThrow('Invalid server response');
  });

  it('returns binary downloads unchanged', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    expect(await request.post('/export-pdf', null, { responseType: 'blob', adapter: reply(200, blob) }))
      .toBe(blob);
    const stream = new ReadableStream();
    expect(await request.get('/download', { responseType: 'stream', adapter: reply(200, stream) }))
      .toBe(stream);
  });
});
