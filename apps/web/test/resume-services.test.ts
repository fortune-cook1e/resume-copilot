import axios, { type AxiosAdapter } from 'axios';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { defaultResumeData } from '@resume-copilot/contracts';

// Replace only the network boundary; use the real request wrapper and services.
let payload: unknown;
const originalAdapter = axios.defaults.adapter;
const adapter: AxiosAdapter = async config => ({
  config, status: 200, statusText: 'OK', headers: {}, data: { data: payload, error: null },
});
let services: typeof import('@/services/resume');

beforeAll(async () => {
  axios.defaults.adapter = adapter;
  services = await import('@/services/resume');
});
afterAll(() => { axios.defaults.adapter = originalAdapter; });

it('rejects malformed resume bodies before they reach the editor', async () => {
  payload = {
    id: 'resume', title: 'Draft', description: '', visibility: 'private',
    createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z',
    data: { ...structuredClone(defaultResumeData), modules: { ...defaultResumeData.modules, languages: 123 } },
  };
  await expect(services.getResume('resume')).rejects.toThrow();
  await expect(services.createResume({ title: 'Draft' })).rejects.toThrow();
  await expect(services.updateResume('resume', { title: 'Draft' })).rejects.toThrow();
});

it('parses valid details and rejects malformed list/delete responses', async () => {
  const detail = {
    id: 'resume', title: 'Draft', description: '', visibility: 'private',
    createdAt: '2026-10-08T00:00:00.000Z', updatedAt: '2026-10-08T00:00:00.000Z',
    data: structuredClone(defaultResumeData),
  };
  payload = detail;
  expect(await services.getResume('resume')).toEqual(detail);
  expect(await services.createResume({ title: 'Draft' })).toEqual(detail);
  expect(await services.updateResume('resume', { title: 'Draft' })).toEqual(detail);
  const item = {
    id: detail.id, title: detail.title, description: detail.description,
    visibility: detail.visibility, createdAt: detail.createdAt, updatedAt: detail.updatedAt,
  };
  payload = [item];
  expect(await services.getResumes()).toEqual([item]);
  payload = { id: 'resume' };
  expect(await services.deleteResume('resume')).toEqual({ id: 'resume' });
  payload = [{ ...detail, visibility: 'everyone' }];
  await expect(services.getResumes()).rejects.toThrow();
  payload = { id: 123 };
  await expect(services.deleteResume('resume')).rejects.toThrow();
});
