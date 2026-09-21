import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function createApplication() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  return app;
}

async function bootstrap() {
  const app = await createApplication();
  await app.listen(Number(process.env.PORT ?? 3001));
}

if (require.main === module) {
  void bootstrap().catch(() => {
    console.error('Failed to start the API.');
    process.exitCode = 1;
  });
}
