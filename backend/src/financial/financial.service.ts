import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SqlValidatorService } from '../llm/services/sql-validator.service';
import { LLM_READER_CONNECTION } from './financial.constants';

export interface FinancialQueryResult {
  rows: unknown[];
  rowCount: number;
  truncated: boolean;
}

/**
 * Executes LLM-generated SQL under BOTH guardrails (CLAUDE.md §3 rule 2):
 *  - Layer 2: SqlValidatorService rejects the query in code, and
 *  - Layer 3: it runs on the SELECT-only `llm_reader` connection, so Postgres
 *    rejects any write even if Layer 2 were bypassed.
 * Results are capped to bound tool output; a statement_timeout on the connection
 * aborts runaway queries.
 */
@Injectable()
export class FinancialService {
  private readonly maxRows = 200;

  constructor(
    @InjectDataSource(LLM_READER_CONNECTION) private readonly llmReader: DataSource,
    private readonly validator: SqlValidatorService,
  ) {}

  async execute(sql: string): Promise<FinancialQueryResult> {
    const validation = this.validator.validate(sql);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Query blocked by SQL validator',
        errors: validation.errors,
      });
    }

    // Runs as llm_reader (Layer 3). A slice bounds the returned payload; the
    // connection's statement_timeout bounds runtime for pathological queries.
    const rows = (await this.llmReader.query(sql)) as unknown[];
    const truncated = rows.length > this.maxRows;
    return {
      rows: truncated ? rows.slice(0, this.maxRows) : rows,
      rowCount: truncated ? this.maxRows : rows.length,
      truncated,
    };
  }
}
