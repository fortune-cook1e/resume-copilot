import { createRequire } from 'node:module'
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Module,
  Post,
  StreamableFile,
  type INestApplication,
} from '@nestjs/common'
import { httpResponseSchema, paginatedDataSchema } from '@resume-copilot/contracts'
import { z } from 'zod'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
const require = createRequire(import.meta.url)
const { NestFactory, APP_FILTER, APP_INTERCEPTOR } =
  require('@nestjs/core') as typeof import('@nestjs/core')
const { RawResponse } =
  require('../dist/common/responses/raw-response.js') as typeof import('../dist/common/responses/raw-response.js')
const { HttpExceptionFilter } =
  require('../dist/common/filters/http-exception.filter.js') as typeof import('../dist/common/filters/http-exception.filter.js')
const { ResponseInterceptor } =
  require('../dist/common/responses/response.interceptor.js') as typeof import('../dist/common/responses/response.interceptor.js')
const publicOrigin = 'http://localhost:3000'

@Controller('test-errors')
class ErrorController {
  @Get('expected')
  expected() {
    throw new BadRequestException('private-expected-error')
  }

  @Get('unexpected')
  unexpected() {
    throw new Error('private-internal-error')
  }

  @Get('value')
  value() {
    return { id: '123' }
  }

  @Get('empty')
  empty() {
    return undefined
  }

  @Get('page')
  page() {
    return { items: [], pager: { page: 4, pageSize: 20, total: 41 } }
  }

  @Get('file')
  file() {
    return new StreamableFile(Buffer.from('file-contents'), { type: 'application/octet-stream' })
  }

  @RawResponse()
  @Get('native')
  native() {
    return { native: true }
  }

  @Get('no-content')
  @HttpCode(204)
  noContent() {
    return undefined
  }

  @Post()
  acceptBody() {
    return { accepted: true }
  }
}

@Module({
  controllers: [ErrorController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
class TestModule {}

describe('compiled HTTP response contracts', () => {
  let app: INestApplication
  let baseURL: string
  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: false })
    app.setGlobalPrefix('api')
    await app.listen(0, '127.0.0.1')
    baseURL = await app.getUrl()
  })
  afterAll(async () => {
    await app?.close()
  })
  it('wraps business JSON while leaving the HTTP status and request ID header intact', async () => {
    const response = await fetch(`${baseURL}/api/test-errors/value`)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ data: { id: '123' }, error: null })
    expect(httpResponseSchema(z.object({ id: z.string() })).parse(body)).toEqual(body)
  })

  it('preserves 201 and wraps an empty successful result as null', async () => {
    const created = await fetch(`${baseURL}/api/test-errors`, {
      method: 'POST',
      headers: { origin: publicOrigin },
    })
    expect(created.status).toBe(201)
    expect(await created.json()).toEqual({ data: { accepted: true }, error: null })
    const empty = await fetch(`${baseURL}/api/test-errors/empty`)
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual({ data: null, error: null })
  })

  it('preserves page number and accurate total when requesting beyond the last page', async () => {
    const response = await fetch(`${baseURL}/api/test-errors/page`)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      data: { items: [], pager: { page: 4, pageSize: 20, total: 41 } },
      error: null,
    })
    const schema = httpResponseSchema(paginatedDataSchema(z.object({ id: z.string() })))
    expect(schema.parse(body)).toEqual(body)
    expect(
      schema.safeParse({
        data: { items: [], pager: { page: 0, pageSize: 20, total: 41 } },
        error: null,
      }).success,
    ).toBe(false)
  })

  it('does not wrap native, file or bodyless responses', async () => {
    const native = await fetch(`${baseURL}/api/test-errors/native`)
    expect(await native.json()).toEqual({ native: true })
    const file = await fetch(`${baseURL}/api/test-errors/file`)
    expect(file.headers.get('content-type')).toContain('application/octet-stream')
    expect(await file.text()).toBe('file-contents')
    const noContent = await fetch(`${baseURL}/api/test-errors/no-content`)
    expect(noContent.status).toBe(204)
    expect(await noContent.text()).toBe('')
  })

  it('sanitizes internal exceptions', async () => {
    const response = await fetch(`${baseURL}/api/test-errors/unexpected`)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error' },
    })
  })
})

it('normalizes the configured public origin and rejects unsafe production configuration without values', () => {
  const { parseAppConfig } =
    require('../dist/config/app.config.js') as typeof import('../dist/config/app.config.js')
  const input = {
    BETTER_AUTH_URL: 'http://localhost:3000/',
    BETTER_AUTH_SECRET: 'test-only-secret-of-more-than-32-characters',
    GOOGLE_CLIENT_ID: 'test',
    GOOGLE_CLIENT_SECRET: 'test',
  }
  expect(parseAppConfig(input).BETTER_AUTH_URL).toBe('http://localhost:3000')
  expect(() => parseAppConfig({ ...input, NODE_ENV: 'production' })).toThrow(
    'Invalid configuration: BETTER_AUTH_URL',
  )
  expect(() => parseAppConfig({ ...input, BETTER_AUTH_SECRET: 'private-short-value' })).toThrow(
    'Invalid configuration: BETTER_AUTH_SECRET',
  )
})
