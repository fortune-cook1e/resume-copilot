import {
  BadRequestException,
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common'
import { exportResumePdfSchema } from '@resume-copilot/contracts'
import { SessionGuard, type AuthenticatedRequest } from '../auth/session.guard'
import { ResumesService } from './resumes.service'

@Controller('export-pdf')
@UseGuards(SessionGuard)
export class PdfExportController {
  constructor(private readonly resumes: ResumesService) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async export(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = exportResumePdfSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException()

    const pdf = await this.resumes.exportPdf(request.trustedUser!.id, parsed.data.resumeId)
    return new StreamableFile(Buffer.from(pdf), {
      type: 'application/pdf',
      disposition: 'attachment; filename="resume.pdf"',
    })
  }
}
