import { Controller, Get, Header, Res } from '@nestjs/common'
import type { Response } from 'express'
import { RawResponse } from '../common/responses/raw-response'
import { DatabaseService } from '../database/database.module'

@RawResponse()
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  getHealth() {
    return { status: 'ok' }
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    try {
      await this.database.checkHealth()
      return { status: 'ready', checks: { database: 'up' } }
    } catch {
      response.status(503)
      return { status: 'not_ready', checks: { database: 'down' } }
    }
  }
}
