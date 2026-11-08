import { Inject, Injectable, Module } from '@nestjs/common'
import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { D1_BINDING } from '../config/runtime.module'
import * as schema from './schema'

@Injectable()
export class DatabaseService {
  readonly db: ReturnType<typeof drizzle<typeof schema>>
  constructor(@Inject(D1_BINDING) private readonly binding: D1Database) {
    this.db = drizzle(binding, { schema })
  }
  async checkHealth() {
    let deadline: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        this.binding.prepare('SELECT 1').first(),
        new Promise<never>((_resolve, reject) => {
          deadline = setTimeout(() => reject(new Error('Database health check timed out')), 1000)
        }),
      ])
    } finally {
      clearTimeout(deadline)
    }
  }
}

@Module({ providers: [DatabaseService], exports: [DatabaseService] })
export class DatabaseModule {}
