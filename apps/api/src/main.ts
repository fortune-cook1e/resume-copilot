import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { ConfigType } from '@nestjs/config'
import { Logger as NestLogger } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { text, type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import { toNodeHandler } from 'better-auth/node'
import { Logger, PinoLogger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { AuthService } from './auth/auth.service'
import { requestLogging } from './common/logging'
import { originProtection } from './common/middleware/origin.middleware'
import { appConfig } from './config/app.config'
import type { WorkerBindings } from './config/runtime.module'

export async function createApplication(bindings: WorkerBindings) {
  let app: NestExpressApplication
  try {
    app = await NestFactory.create<NestExpressApplication>(AppModule.register(bindings), {
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

  await app.init()
  return app
}
