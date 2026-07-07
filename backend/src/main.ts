import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // All routes under /api (matches openapi_spec.yaml)
  app.setGlobalPrefix('api');

  // Global input validation (NFR-011). whitelist strips unknown props;
  // forbidNonWhitelisted rejects them outright.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Needed to read the httpOnly refresh cookie on /api/auth/refresh (Phase 2)
  app.use(cookieParser());

  // Explicit-origin CORS with credentials for the refresh cookie
  // (CR-017 / GAP-011 — never `*` with credentials).
  app.enableCors({
    origin: config.get<string>('app.corsOrigin'),
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = config.get<number>('app.port') ?? 3001;
  await app.listen(port);
}

void bootstrap();
