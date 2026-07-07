import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

// Standalone DataSource for the TypeORM CLI (migrations). Not used by the Nest
// runtime — the app builds its connection via TypeOrmModule.forRootAsync.
loadEnv({ path: join(process.cwd(), '..', '.env') });
loadEnv();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'financial_db',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, '..', '..', 'migrations', '*.{ts,js}')],
  synchronize: false, // never — migrations only (CLAUDE.md §2)
});
