import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../database/database.module'
import { ResumesController } from './resumes.controller'
import { ResumesRepository } from './resumes.repository'
import { ResumesService } from './resumes.service'
import { PdfExportController } from './pdf-export.controller'
import { PdfRenderer } from './pdf.renderer'

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ResumesController, PdfExportController],
  providers: [ResumesService, ResumesRepository, PdfRenderer],
})
export class ResumesModule {}
