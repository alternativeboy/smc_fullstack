import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqlValidatorService } from '../llm/services/sql-validator.service';
import { FinancialData } from './entities/financial-data.entity';
import { LLM_READER_CONNECTION } from './financial.constants';
import { FinancialService } from './financial.service';

/**
 * Registers a SECOND TypeORM connection authenticated as `llm_reader` (SELECT-only)
 * with a 5s statement_timeout — kept entirely separate from the app-user
 * connection. Provides SqlValidatorService so FinancialService enforces Layer 2 +
 * Layer 3 together; exported so the Phase-4b LlmModule can reuse both without a
 * circular dependency.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: LLM_READER_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        name: LLM_READER_CONNECTION,
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.getOrThrow<string>('LLM_READER_USER'),
        password: config.getOrThrow<string>('LLM_READER_PASSWORD'),
        database: config.get<string>('database.name'),
        entities: [FinancialData],
        synchronize: false,
        extra: { statement_timeout: 5000 },
      }),
    }),
  ],
  providers: [FinancialService, SqlValidatorService],
  exports: [FinancialService, SqlValidatorService],
})
export class FinancialModule {}
