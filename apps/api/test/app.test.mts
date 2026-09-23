import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { BadRequestException, Controller, Get, HttpCode, Module, Post, StreamableFile, type INestApplication } from '@nestjs/common';
import { httpErrorSchema, httpResponseSchema, paginatedDataSchema } from '@resume-copilot/contracts';
import { z } from 'zod';
import { afterAll, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
// Load every compiled module through Node, avoiding duplicate DI token identities
// from mixing Vite-transformed imports with the production CommonJS require cache.
const require = createRequire(import.meta.url);
const { createApplication } = require('../dist/main.js') as typeof import('../dist/main.js');
const { AppModule } = require('../dist/app.module.js') as typeof import('../dist/app.module.js');
const { ApplicationState } = require('../dist/lifecycle/application-state.js') as typeof import('../dist/lifecycle/application-state.js');
const { RawResponse } = require('../dist/common/responses/raw-response.js') as typeof import('../dist/common/responses/raw-response.js');

@Controller('test-errors')
class ErrorController {
  @Get('expected')
  expected() { throw new BadRequestException('private-expected-error'); }

  @Get('unexpected')
  unexpected() { throw new Error('private-internal-error'); }

  @Get('value')
  value() { return { id: '123' }; }

  @Get('empty')
  empty() { return undefined; }

  @Get('page')
  page() { return { items: [], pager: { page: 4, pageSize: 20, total: 41 } }; }

  @Get('file')
  file() { return new StreamableFile(Buffer.from('file-contents'), { type: 'application/octet-stream' }); }

  @RawResponse()
  @Get('native')
  native() { return { native: true }; }

  @Get('no-content')
  @HttpCode(204)
  noContent() { return undefined; }

  @Post()
  acceptBody() { return { accepted: true }; }
}

@Module({ imports: [AppModule], controllers: [ErrorController] })
class TestModule {}

// Test-only providers run against the compiled production bootstrap in a real process.
const childFixture = `
  const { Controller, Get, Injectable, Module } = require('@nestjs/common');
  const { bootstrap } = require('./dist/main.js');
  const { AppModule } = require('./dist/app.module.js');
  const { ApplicationState } = require('./dist/lifecycle/application-state.js');
  let app;
  class SlowController {
    slow() {
      process.send({ event: 'inflight' });
      return new Promise(resolve => process.once('message', () => {
        resolve({ ready: app.get(ApplicationState).isReady });
      }));
    }
  }
  Controller('slow')(SlowController);
  Get()(SlowController.prototype, 'slow', Object.getOwnPropertyDescriptor(SlowController.prototype, 'slow'));
  class ClosingResource {
    onModuleDestroy() {
      process.send({ event: 'destroying' });
      if (process.env.STALL_CLOSE === '1') return new Promise(() => {});
    }
  }
  Injectable()(ClosingResource);
  class TestModule {}
  Module({ imports: [AppModule], controllers: [SlowController], providers: [ClosingResource] })(TestModule);
  bootstrap(TestModule).then(async instance => {
    app = instance;
    for (const signal of ['SIGTERM', 'SIGINT']) {
      process.on(signal, () => setImmediate(() => process.send({ event: 'signal' })));
    }
    process.send({ event: 'ready', url: await app.getUrl() });
  }).catch(() => process.exit(1));
`;

async function startChild(env: Record<string, string> = {}) {
  const portServer = createServer();
  portServer.listen(0, '127.0.0.1');
  await once(portServer, 'listening');
  const address = portServer.address();
  if (!address || typeof address === 'string') throw new Error('No test port allocated');
  await new Promise<void>((resolve, reject) => portServer.close(error => error ? reject(error) : resolve()));
  const child = spawn(process.execPath, ['-e', childFixture], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(address.port), SHUTDOWN_TIMEOUT_MS: '2000', ...env },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  const messages: { event: string; url?: string }[] = [];
  const output: string[] = [];
  child.on('message', message => messages.push(message as { event: string; url?: string }));
  child.stdout!.on('data', chunk => output.push(String(chunk)));
  child.stderr!.on('data', chunk => output.push(String(chunk)));
  const exited = once(child, 'exit');
  onTestFinished(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exited;
  });
  await vi.waitFor(() => expect(messages.some(message => message.event === 'ready')).toBe(true), { timeout: 5000 });
  return { child, messages, output, exited, url: messages.find(message => message.event === 'ready')!.url! };
}

// Exercise the actual TypeScript build, including Nest's decorator metadata.
// Run through `pnpm test`, which builds before starting Vitest.
describe('API bootstrap', () => {
  let app: INestApplication;
  let baseURL: string;
  const logs: string[] = [];

  beforeAll(async () => {
    vi.stubEnv('BODY_LIMIT_BYTES', '128');
    vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
      logs.push(String(chunk));
      return true;
    });
    app = await createApplication(TestModule);
    await app.listen(0, '127.0.0.1');
    baseURL = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(['private-invalid-port', '', '0', '65536', '1.5'])('rejects invalid port configuration (%j) without exposing its value', invalidPort => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../dist/main.js', import.meta.url))], {
      env: { ...process.env, NODE_ENV: 'test', PORT: invalidPort },
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('Invalid configuration: PORT');
    expect(result.stdout + result.stderr).not.toContain('private-invalid-port');
  });

  it('does not flush unsafe initialization errors in development', () => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../dist/main.js', import.meta.url))], {
      env: { ...process.env, NODE_ENV: 'development', PORT: 'private-dev-invalid-port' },
      encoding: 'utf8', timeout: 5000,
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('Invalid configuration: PORT');
    expect(result.stdout + result.stderr).not.toContain('private-dev-invalid-port');
  });

  it('wraps business JSON while leaving the HTTP status and request ID header intact', async () => {
    const response = await fetch(`${baseURL}/api/test-errors/value`);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
    const body = await response.json();
    expect(body).toEqual({ data: { id: '123' }, error: null });
    expect(httpResponseSchema(z.object({ id: z.string() })).parse(body)).toEqual(body);
  });

  it('preserves 201 and wraps an empty successful result as null', async () => {
    const created = await fetch(`${baseURL}/api/test-errors`, { method: 'POST' });
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ data: { accepted: true }, error: null });
    const empty = await fetch(`${baseURL}/api/test-errors/empty`);
    expect(empty.status).toBe(200);
    expect(await empty.json()).toEqual({ data: null, error: null });
  });

  it('preserves page number and accurate total when requesting beyond the last page', async () => {
    const response = await fetch(`${baseURL}/api/test-errors/page`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      data: { items: [], pager: { page: 4, pageSize: 20, total: 41 } }, error: null,
    });
    const schema = httpResponseSchema(paginatedDataSchema(z.object({ id: z.string() })));
    expect(schema.parse(body)).toEqual(body);
    expect(schema.safeParse({ data: { items: [], pager: { page: 0, pageSize: 20, total: 41 } }, error: null }).success).toBe(false);
  });

  it('does not wrap native, file or bodyless responses', async () => {
    const native = await fetch(`${baseURL}/api/test-errors/native`);
    expect(await native.json()).toEqual({ native: true });
    const file = await fetch(`${baseURL}/api/test-errors/file`);
    expect(file.headers.get('content-type')).toContain('application/octet-stream');
    expect(await file.text()).toBe('file-contents');
    const noContent = await fetch(`${baseURL}/api/test-errors/no-content`);
    expect(noContent.status).toBe(204);
    expect(await noContent.text()).toBe('');
  });

  it('serves health under the API prefix', async () => {
    const response = await fetch(`${baseURL}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('reports readiness after initialization without allowing cached probes', async () => {
    const response = await fetch(`${baseURL}/api/health/ready`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ready' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('does not expose an unprefixed health endpoint', async () => {
    const response = await fetch(`${baseURL}/health`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ data: null, error: { code: 'NOT_FOUND', message: 'Not Found' } });
  });

  it('exits nonzero if its listening port is already occupied', () => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../dist/main.js', import.meta.url))], {
      env: { ...process.env, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: new URL(baseURL).port },
      encoding: 'utf8', timeout: 5000,
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('Failed to start the API.');
  });

  it.each([
    ['expected', 400, 'BAD_REQUEST', 'Bad Request'],
    ['unexpected', 500, 'INTERNAL_SERVER_ERROR', 'Internal Server Error'],
  ] as const)('sanitizes %s errors while preserving status and log correlation', async (path, statusCode, code, message) => {
    const response = await fetch(`${baseURL}/api/test-errors/${path}?secret=private-query`);
    expect(response.status).toBe(statusCode);
    const requestId = response.headers.get('x-request-id');
    const body = httpErrorSchema.parse(await response.json());
    expect(body).toEqual({ data: null, error: { code, message } });
    await vi.waitFor(() => expect(logs.join('')).toContain(requestId!));
    expect(logs.join('')).not.toContain('private-');
  });

  it('sanitizes malformed JSON errors before controller execution', async () => {
    const response = await fetch(`${baseURL}/api/test-errors`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"private-json":',
    });
    expect(response.status).toBe(400);
    const body = httpErrorSchema.parse(await response.json());
    expect(body.error.message).toBe('Bad Request');
    const requestId = response.headers.get('x-request-id');
    await vi.waitFor(() => expect(logs.join('')).toContain(requestId!));
    expect(logs.join('')).not.toContain('private-');
  });

  it.each(['application/json', 'application/x-www-form-urlencoded'])('rejects oversized %s bodies before route handling and logs no secrets', async contentType => {
    const response = await fetch(`${baseURL}/api/test-errors?secret=private-query`, {
      method: 'POST',
      headers: {
        'content-type': contentType, authorization: 'Bearer private-auth',
        cookie: 'session=private-cookie', 'x-request-id': 'private-forged-id',
      },
      body: contentType === 'application/json'
        ? JSON.stringify({ secret: 'private-body'.repeat(100) })
        : `secret=${'private-body'.repeat(100)}`,
    });
    expect(response.status).toBe(413);
    const body = httpErrorSchema.parse(await response.json());
    const requestId = response.headers.get('x-request-id');
    expect(body.error.message).toBe('Payload Too Large');
    await vi.waitFor(() => expect(logs.join('')).toContain(requestId!));
    const entry = logs.flatMap(line => line.trim().split('\n')).map(line => JSON.parse(line) as Record<string, unknown>)
      .find(value => value.requestId === requestId);
    expect(entry).toMatchObject({ statusCode: 413, method: 'POST', route: '<unmatched>' });
    expect(logs.join('')).not.toContain('private-');
  });

  it('keeps native Nest startup logs in development without losing early initialization logs', async () => {
    const runtime = await startChild({ NODE_ENV: 'development', LOG_LEVEL: 'info', FORCE_COLOR: '1' });
    await vi.waitFor(() => expect(runtime.output.join('')).toContain('[NestFactory]'));
    const output = runtime.output.join('');
    expect(output).toContain('[Nest]');
    expect(output).toContain('Starting Nest application');
    expect(output).toContain('AppModule dependencies initialized');
    expect(output).toContain('[RoutesResolver]');
    expect(output.match(/Starting Nest application/g)).toHaveLength(1);
    const response = await fetch(`${runtime.url}/api/health?token=private-dev-query`, {
      headers: { authorization: 'Bearer private-dev-token' },
    });
    const requestId = response.headers.get('x-request-id');
    expect(response.status).toBe(200);
    expect(requestId).toBeTruthy();
    await vi.waitFor(() => expect(runtime.output.join('')).toContain(requestId!));
    expect(runtime.output.join('')).not.toContain('private-dev-');
    runtime.child.kill('SIGTERM');
    expect(await runtime.exited).toEqual([0, null]);
  });

  it('emits JSON startup logs in production, including early initialization', async () => {
    const runtime = await startChild({ NODE_ENV: 'production' });
    await vi.waitFor(() => expect(runtime.output.join('')).toContain('Starting Nest application'));
    const records = runtime.output.join('').trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as Record<string, unknown>);
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({ context: 'NestFactory', msg: 'Starting Nest application...' }),
      expect.objectContaining({ context: 'NestApplication', msg: 'Nest application successfully started' }),
    ]));
    runtime.child.kill('SIGTERM');
    expect(await runtime.exited).toEqual([0, null]);
  });

  it.each(['SIGTERM', 'SIGINT'] as const)('drains an in-flight request on %s before destroying resources', async signal => {
    const runtime = await startChild();
    const inflight = fetch(`${runtime.url}/api/slow`);
    // Cleanup may close the socket after an assertion fails; observe that rejection.
    void inflight.catch(() => {});
    await vi.waitFor(() => expect(runtime.messages.some(message => message.event === 'inflight')).toBe(true));
    runtime.child.kill(signal);
    await vi.waitFor(() => expect(runtime.messages.some(message => message.event === 'signal')).toBe(true));
    expect(runtime.messages.some(message => message.event === 'destroying')).toBe(false);
    runtime.child.send('complete');
    const response = await inflight;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { ready: false }, error: null });
    expect(await runtime.exited).toEqual([0, null]);
    expect(runtime.messages.some(message => message.event === 'destroying')).toBe(true);
  });

  it('bounds shutdown when a resource never finishes closing', async () => {
    const runtime = await startChild({ STALL_CLOSE: '1', SHUTDOWN_TIMEOUT_MS: '150' });
    runtime.child.kill('SIGINT');
    await vi.waitFor(() => expect(runtime.child.exitCode).toBe(1), { timeout: 2000 });
    expect(await runtime.exited).toEqual([1, null]);
    expect(runtime.output.join('')).toContain('API shutdown timed out');
  });

  it('returns a safe error with a server-generated request ID', async () => {
    const response = await fetch(`${baseURL}/private-path?token=private-query`, {
      headers: { 'x-request-id': 'untrusted-id', authorization: 'Bearer private-token' },
    });
    const requestId = response.headers.get('x-request-id');
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await response.json()).toEqual({
      data: null, error: { code: 'NOT_FOUND', message: 'Not Found' },
    });
  });

  it('reports not-ready during shutdown while liveness remains independent', async () => {
    // Exercise the same transition used by the signal handler; real signals are
    // tested above since an externally closed listener cannot reliably serve 503.
    app.get(ApplicationState).beginShutdown();
    const ready = await fetch(`${baseURL}/api/health/ready`);
    expect(ready.status).toBe(503);
    expect(await ready.json()).toEqual({
      statusCode: 503, code: 'SERVICE_UNAVAILABLE', message: 'Service Unavailable',
      requestId: ready.headers.get('x-request-id'),
    });
    expect(ready.headers.get('cache-control')).toBe('no-store');
    const work = await fetch(`${baseURL}/api/test-errors`, { method: 'POST' });
    expect(work.status).toBe(503);
    expect(work.headers.get('connection')).toBe('close');
    const live = await fetch(`${baseURL}/api/health`);
    expect(live.status).toBe(200);
  });
});
