import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CorsIoAdapter } from './common/cors-io.adapter';
import { corsOrigins } from './common/cors';
import { DomainErrorFilter } from './common/domain-error.filter';

function loadLocalEnv(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: in production variables come from the platform.
  }
}

async function bootstrap(): Promise<void> {
  loadLocalEnv();
  const app = await NestFactory.create(AppModule);
  const origin = corsOrigins();
  app.use(helmet());
  app.enableCors({ origin });
  app.useWebSocketAdapter(new CorsIoAdapter(app, origin));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new DomainErrorFilter());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}

void bootstrap();
