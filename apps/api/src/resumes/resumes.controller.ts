import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { createResumeSchema, updateResumeSchema } from '@resume-copilot/contracts'
import { SessionGuard, type AuthenticatedRequest } from '../auth/session.guard'
import { ResumesService } from './resumes.service'

@Controller('resumes')
@UseGuards(SessionGuard)
export class ResumesController {
  constructor(private readonly resumes: ResumesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() request: AuthenticatedRequest) {
    return this.resumes.list(request.trustedUser!.id)
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  find(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.resumes.find(request.trustedUser!.id, id)
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = createResumeSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException()
    return this.resumes.create(request.trustedUser!.id, parsed.data)
  }

  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    const parsed = updateResumeSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException()
    return this.resumes.update(request.trustedUser!.id, id, parsed.data)
  }

  @Delete(':id')
  @Header('Cache-Control', 'no-store')
  delete(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.resumes.delete(request.trustedUser!.id, id)
  }
}
