import { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { LLM_READER_CONNECTION } from '../src/financial/financial.constants';
import { FinancialService } from '../src/financial/financial.service';

/**
 * Phase 4a.2 — Guardrail Layer 3 (requires the running docker stack). Proves the
 * llm_reader connection can read financial_data but is rejected by Postgres on
 * any write, INDEPENDENT of the Layer 2 validator, plus the row cap and the
 * statement_timeout.
 */
describe('FinancialService / llm_reader (e2e)', () => {
  let app: INestApplication;
  let service: FinancialService;
  let llmReader: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    service = app.get(FinancialService);
    llmReader = app.get<DataSource>(getDataSourceToken(LLM_READER_CONNECTION));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('executes a valid SELECT and returns rows', async () => {
    const res = await service.execute(
      'SELECT company, revenue FROM financial_data WHERE year = 2024 ORDER BY revenue DESC LIMIT 5',
    );
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows.length).toBeLessThanOrEqual(5);
    expect(res.truncated).toBe(false);
  });

  it('caps a large cross-join at 200 rows (truncated)', async () => {
    const res = await service.execute('SELECT f1.company FROM financial_data f1, financial_data f2');
    expect(res.rowCount).toBe(200);
    expect(res.rows).toHaveLength(200);
    expect(res.truncated).toBe(true);
  });

  // Layer 3, INDEPENDENT of the validator: run writes straight through the
  // llm_reader connection (bypassing SqlValidatorService) — Postgres must reject.
  it.each([
    ["INSERT INTO financial_data VALUES ('x','x','x',2099,0,0,0,0)"],
    ['UPDATE financial_data SET revenue = 0'],
    ['DELETE FROM financial_data'],
  ])('Postgres rejects write via llm_reader: %s', async (sql) => {
    await expect(llmReader.query(sql)).rejects.toThrow(/permission denied/i);
  });

  it('cannot read another table via llm_reader (SELECT users → denied)', async () => {
    await expect(llmReader.query('SELECT * FROM users')).rejects.toThrow(/permission denied/i);
  });

  it('statement_timeout aborts a slow query (~5s)', async () => {
    await expect(llmReader.query('SELECT pg_sleep(10)')).rejects.toThrow(/statement timeout/i);
  }, 15000);
});
