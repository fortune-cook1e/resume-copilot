import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ResumesController } from './resumes.controller';
import { ResumesRepository } from './resumes.repository';
import { ResumesService } from './resumes.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ResumesController],
  providers: [ResumesService, ResumesRepository],
})
export class ResumesModule {}
