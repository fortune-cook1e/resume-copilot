import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
  type OnModuleDestroy,
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { Logger } from 'nestjs-pino'
import { appConfig } from '../config/app.config'

@Injectable()
export class ShutdownDeadline implements OnModuleDestroy, OnApplicationShutdown {
  private deadline?: NodeJS.Timeout

  constructor(
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
    private readonly logger: Logger,
  ) {}

  onModuleDestroy(): void {
    // Keep the timer referenced so a hung hook cannot look like a successful exit.
    this.deadline = setTimeout(() => {
      this.logger.error('API shutdown timed out')
      process.exit(1)
    }, this.config.SHUTDOWN_TIMEOUT_MS)
  }

  onApplicationShutdown(signal?: string): void {
    // On a signal, Nest exits after ALL shutdown hooks; keep the deadline until then.
    // A programmatic app.close() must instead leave the caller's process running.
    if (!signal) clearTimeout(this.deadline)
  }
}
