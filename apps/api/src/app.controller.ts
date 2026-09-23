import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { ApplicationState } from './lifecycle/application-state';
import { RawResponse } from './common/responses/raw-response';

@RawResponse()
@Controller('health')
export class AppController {
  constructor(private readonly state: ApplicationState) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  getHealth() {
    return { status: 'ok' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  getReadiness() {
    if (!this.state.isReady) throw new ServiceUnavailableException();
    return { status: 'ready' };
  }
}
