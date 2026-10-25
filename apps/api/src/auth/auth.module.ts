import { Module } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { appConfig } from '../config/app.config'
import { DatabaseModule, DatabaseService } from '../database/database.module'
import { AuthService } from './auth.service'
import { MeController } from './me.controller'
import { SessionGuard } from './session.guard'

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: AuthService,
      useFactory: (database: DatabaseService, config: ConfigType<typeof appConfig>) =>
        AuthService.create(database, config),
      inject: [DatabaseService, appConfig.KEY],
    },
    SessionGuard,
  ],
  controllers: [MeController],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
