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
import { createMcpHandler } from './mcp/mcp-handler'
import { AUTH_SERVER_METADATA_PATH, MCP_METADATA_PATH, MCP_PATH } from './mcp/protocol'
import { ResumesService } from './resumes/resumes.service'

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

  const auth = app.get(AuthService)
  if (config.MCP_CLIENT_ID) {
    const handleMcp = toNodeHandler(
      createMcpHandler(config.BETTER_AUTH_URL, auth, app.get(ResumesService)),
    )
    const parseMcpBody = text({ type: 'application/json', limit: config.BODY_LIMIT_BYTES })
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (![MCP_PATH, MCP_METADATA_PATH, AUTH_SERVER_METADATA_PATH].includes(request.path))
        return next()
      parseMcpBody(request, response, (error) => {
        if (error) return next(error)
        void handleMcp(request, response).catch(next)
      })
    })
  }
  app.use('/api', originProtection(config.BETTER_AUTH_URL, config.MCP_CLIENT_ID !== undefined))

  // Better Auth owns its redirects, Cookies and body parsing; mount it before Nest parsers.
  app.use(
    '/api/auth',
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader('Cache-Control', 'no-store')
      next()
    },
    text({ type: () => true, limit: config.BODY_LIMIT_BYTES }),
    toNodeHandler(auth.auth),
  )

  app.useBodyParser('json', { limit: config.BODY_LIMIT_BYTES })
  app.useBodyParser('urlencoded', { limit: config.BODY_LIMIT_BYTES, extended: false })
  app.setGlobalPrefix('api')

  await app.init()
  return app
}
