import { createRequire } from 'node:module'
import type { D1Database } from '@cloudflare/workers-types'
import { Module, type INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

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
    const database = new DatabaseService({
      prepare: () => ({ first: () => new Promise(() => {}) }),
    } as unknown as D1Database)
    databaseProbe = () => database.checkHealth()
    const response = await fetch(`${baseURL}/api/health/ready`, {
      signal: AbortSignal.timeout(2000),
    })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ status: 'not_ready', checks: { database: 'down' } })
  })
})
