import { Injectable, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class ApplicationState implements OnApplicationBootstrap, OnModuleDestroy {
  private ready = false;

  get isReady(): boolean {
    return this.ready;
  }

  onApplicationBootstrap(): void {
    this.ready = true;
  }

  onModuleDestroy(): void {
    this.beginShutdown();
  }

  beginShutdown(): void {
    this.ready = false;
  }
}
