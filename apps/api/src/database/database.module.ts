import { Injectable, Module, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { appConfig } from '../config/app.config'
import * as schema from './schema'

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly client: postgres.Sql
  readonly db: ReturnType<typeof drizzle<typeof schema>>

  constructor(config: ConfigType<typeof appConfig>) {
    this.client = postgres(config.DATABASE_URL, { max: 10 })
    this.db = drizzle(this.client, { schema })
  }

  async onModuleInit() {
    await this.client`SELECT 1`
  }

  async checkHealth() {
    const query = this.client`SELECT 1`
    let deadline: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        query,
        new Promise<never>((_resolve, reject) => {
          deadline = setTimeout(() => {
            reject(new Error('Database health check timed out'))
            query.cancel()
          }, 1000)
        }),
      ])
    } finally {
      clearTimeout(deadline)
    }
  }

  // Nest closes HTTP connections before this hook, so in-flight requests retain database access.
  async onApplicationShutdown() {
    await this.client.end({ timeout: 5 })
  }
}

@Module({
  providers: [
    {
      provide: DatabaseService,
      useFactory: (config: ConfigType<typeof appConfig>) => new DatabaseService(config),
      inject: [appConfig.KEY],
    },
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
