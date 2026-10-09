import { Module } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { appConfig } from '../config/app.config'
import { DatabaseModule, DatabaseService } from '../database/database.module'
import { AuthService } from './auth.service'
import { MeController } from './me.controller'
import { SessionGuard } from './session.guard'
import { ConnectionsRepository } from '../oauth/connections.repository'
import { ConnectionsService } from '../oauth/connections.service'

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: ConnectionsRepository,
      useFactory: (database: DatabaseService) => new ConnectionsRepository(database.db),
      inject: [DatabaseService],
    },
    {
      provide: ConnectionsService,
      useFactory: (repository: ConnectionsRepository) => new ConnectionsService(repository),
      inject: [ConnectionsRepository],
    },
    {
      provide: AuthService,
      useFactory: (
        database: DatabaseService,
        config: ConfigType<typeof appConfig>,
        connections: ConnectionsService,
      ) => AuthService.create(database, config, connections),
      inject: [DatabaseService, appConfig.KEY, ConnectionsService],
    },
    SessionGuard,
  ],
  controllers: [MeController],
  exports: [AuthService, ConnectionsService, SessionGuard],
})
export class AuthModule {}
