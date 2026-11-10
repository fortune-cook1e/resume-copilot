import { Module } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { appConfig } from '../config/app.config'
import { DatabaseModule, DatabaseService } from '../database/database.module'
import { AuthService } from './auth.service'
import { MeController } from './me.controller'
import { McpConnectionsService } from './mcp-connections.service'
import { SessionGuard } from './session.guard'

@Module({
  imports: [DatabaseModule],
  providers: [
    McpConnectionsService,
    {
      provide: AuthService,
      useFactory: (
        database: DatabaseService,
        config: ConfigType<typeof appConfig>,
        connections: McpConnectionsService,
      ) => AuthService.create(database, config, connections),
      inject: [DatabaseService, appConfig.KEY, McpConnectionsService],
    },
    SessionGuard,
  ],
  controllers: [MeController],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
