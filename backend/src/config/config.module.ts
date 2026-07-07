import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import databaseConfig from './database.config';
import { validationSchema } from './env.validation';

/**
 * Central configuration (NFR-013). Loads the root `.env`, validates it via the
 * Joi schema (fail-fast), and exposes typed `app.*` / `database.*` namespaces.
 * `isGlobal: true` so ConfigService is injectable everywhere without re-import.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Run from backend/ → root `.env` is one level up. Root wins if both exist.
      envFilePath: ['.env', '../.env'],
      load: [appConfig, databaseConfig],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),
  ],
})
export class AppConfigModule {}
