import { createRequire } from 'node:module'
import { once } from 'node:events'
import { createServer, type Socket } from 'node:net'
import { Module, type INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, beforeEach, describe, expect, it, onTestFinished } from 'vitest'

const require = createRequire(import.meta.url)
const { NestFactory } = require('@nestjs/core') as typeof import('@nestjs/core')
const { HealthController } =
  require('../../dist/health/health.controller.js') as typeof import('../../dist/health/health.controller.js')
const { DatabaseService } =
  require('../../dist/database/database.module.js') as typeof import('../../dist/database/database.module.js')

// The database boundary is controlled; the compiled controller and HTTP server are real.
let databaseProbe: () => Promise<void>

@Module({
  controllers: [HealthController],
  providers: [{ provide: DatabaseService, useValue: { checkHealth: () => databaseProbe() } }],
})
class TestHealthModule {}

describe('health endpoints', () => {
  let app: INestApplication
  let baseURL: string

  beforeAll(async () => {
    app = await NestFactory.create(TestHealthModule, { logger: false })
    app.setGlobalPrefix('api')
    await app.listen(0, '127.0.0.1')
    baseURL = await app.getUrl()
  })

  beforeEach(() => {
    databaseProbe = () => Promise.resolve()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('reports ready when the database probe succeeds', async () => {
    const response = await fetch(`${baseURL}/api/health/ready`)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ status: 'ready', checks: { database: 'up' } })
  })

  it('reports unavailable without exposing database errors while liveness still succeeds', async () => {
    databaseProbe = () => Promise.reject(new Error('private-database-connection-details'))
    const ready = await fetch(`${baseURL}/api/health/ready`)
    expect(ready.status).toBe(503)
    expect(ready.headers.get('cache-control')).toBe('no-store')
    expect(await ready.json()).toEqual({ status: 'not_ready', checks: { database: 'down' } })

    const live = await fetch(`${baseURL}/api/health`)
    expect(live.status).toBe(200)
    expect(await live.json()).toEqual({ status: 'ok' })
  })

  it('returns 503 within the probe deadline when the database stops responding', async () => {
    // Accept TCP but never complete PostgreSQL startup: exercise the real driver without a DB.
    const sockets = new Set<Socket>()
    const stalledDatabase = createServer((socket) => {
      sockets.add(socket)
      socket.on('error', () => {})
      socket.on('close', () => sockets.delete(socket))
    })
    stalledDatabase.listen(0, '127.0.0.1')
    await once(stalledDatabase, 'listening')
    const address = stalledDatabase.address()
    if (!address || typeof address === 'string') throw new Error('No test port allocated')
    const database = new DatabaseService({
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: 3001,
      LOG_LEVEL: 'silent',
      SHUTDOWN_TIMEOUT_MS: 1000,
      BODY_LIMIT_BYTES: 1024,
      DATABASE_URL: `postgresql://test:test@127.0.0.1:${address.port}/resume_copilot_test`,
      BETTER_AUTH_URL: 'http://localhost:3000',
      BETTER_AUTH_SECRET: 'test-only-secret-at-least-thirty-two-characters',
      GOOGLE_CLIENT_ID: 'test-google-client',
      GOOGLE_CLIENT_SECRET: 'test-google-secret',
    })
    onTestFinished(async () => {
      const closed = new Promise<void>((resolve, reject) =>
        stalledDatabase.close((error) => (error ? reject(error) : resolve())),
      )
      for (const socket of sockets) socket.destroy()
      await database.onApplicationShutdown()
      await closed
    })
    databaseProbe = () => database.checkHealth()
    const response = await fetch(`${baseURL}/api/health/ready`, {
      signal: AbortSignal.timeout(2000),
    })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ status: 'not_ready', checks: { database: 'down' } })
  })
})
