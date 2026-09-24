import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { SessionGuard, type AuthenticatedRequest } from './session.guard';

@Controller('me')
@UseGuards(SessionGuard)
export class MeController {
  @Get()
  @Header('Cache-Control', 'no-store')
  me(@Req() request: AuthenticatedRequest) {
    return request.trustedUser;
  }
}
