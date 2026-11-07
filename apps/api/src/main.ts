import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { ConfigType } from '@nestjs/config'
import { Logger as NestLogger, type Type } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import type { Server } from 'node:http'
import { text, type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import { toNodeHandler } from 'better-auth/node'
import { pino } from 'pino'
import { Logger, PinoLogger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { AuthService } from './auth/auth.service'
import { requestLogging } from './common/logging'
import { originProtection } from './common/middleware/origin.middleware'
import { appConfig, ConfigurationError } from './config/app.config'

export async function createApplication(rootModule: Type = AppModule) {
  let app: NestExpressApplication
  try {
    app = await NestFactory.create<NestExpressApplication>(rootModule, {
      abortOnError: false,
      logger: false,
      bufferLogs: true,
      autoFlushLogs: false,
      bodyParser: false, // Mount Better Auth before Nest's body parsers below.
    })
  } catch (error) {
    // A failed provider may have buffered an exception containing credentials.
    // Drain with logging disabled, not into the selected console/Pino logger.
    NestLogger.overrideLogger(false)
    NestLogger.flush()
    throw error
  }
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY)
  app.useLogger(app.get(Logger))
  app.flushLogs()

  // Register in request order. Rejections and parser failures need request IDs and logs too.
  app.use(requestLogging((await app.resolve(PinoLogger)).logger))

  app.use(helmet())
  app.disable('x-powered-by')
  app.set('trust proxy', false)

  // Apply the same origin policy to native auth and every current or future API route.
  app.use('/api', originProtection(config.BETTER_AUTH_URL))

  // Better Auth owns its redirects, Cookies and body parsing; mount it before Nest parsers.
  app.use(
    '/api/auth',
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader('Cache-Control', 'no-store')
      next()
    },
    text({ type: () => true, limit: config.BODY_LIMIT_BYTES }),
    toNodeHandler(app.get(AuthService).auth),
  )

  app.useBodyParser('json', { limit: config.BODY_LIMIT_BYTES })
  app.useBodyParser('urlencoded', { limit: config.BODY_LIMIT_BYTES, extended: false })
  app.setGlobalPrefix('api')

  const server: Server = app.getHttpServer()
  server.requestTimeout = 30000
  server.headersTimeout = 10000
  server.keepAliveTimeout = 5000
  // Active requests can become idle after Nest starts closing the listener.
  // Reap those keep-alive sockets once their response completes, without cutting off work.
  server.on('request', (_request, response) => {
    response.once('finish', () => {
      if (!server.listening) setImmediate(() => server.closeIdleConnections())
    })
  })
  return app
}

export async function bootstrap(rootModule: Type = AppModule) {
  const app = await createApplication(rootModule)
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY)
  try {
    // Nest initializes routes and lifecycle hooks before opening the listener.
    await app.listen(config.PORT, config.HOST)
    app.enableShutdownHooks(['SIGTERM', 'SIGINT'], { useProcessExit: true })
    return app
  } catch (error) {
    // Failed startup must not hang indefinitely while disposing partial resources.
    const deadline = setTimeout(() => {
      pino().fatal('API startup cleanup timed out')
      process.exit(1)
    }, config.SHUTDOWN_TIMEOUT_MS)
    try {
      await app.close()
    } finally {
      clearTimeout(deadline)
    }
    throw error
  }
}

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    // Never serialize the original startup exception: it may contain credentials.
    pino().fatal(error instanceof ConfigurationError ? error.message : 'Failed to start the API.')
    process.exitCode = 1
  })
}
