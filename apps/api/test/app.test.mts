import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApplication } from '../dist/main.js';

// Exercise the actual TypeScript build, including Nest's decorator metadata.
// Run through `pnpm test`, which builds before starting Vitest.
describe('API bootstrap', () => {
  let app: INestApplication;
  let baseURL: string;

  beforeAll(async () => {
    app = await createApplication();
    await app.listen(0, '127.0.0.1');
    baseURL = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves health under the API prefix', async () => {
    const response = await fetch(`${baseURL}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('does not expose an unprefixed health endpoint', async () => {
    const response = await fetch(`${baseURL}/health`);
    expect(response.status).toBe(404);
  });
});
