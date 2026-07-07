import { SqlValidatorService } from './sql-validator.service';

describe('SqlValidatorService (Guardrail Layer 2)', () => {
  const validator = new SqlValidatorService();
  const isValid = (sql: string) => validator.validate(sql).valid;

  describe('rule 1 — must start with SELECT or WITH', () => {
    it('rejects a query not starting with SELECT/WITH', () => {
      const res = validator.validate('EXPLAIN SELECT * FROM financial_data');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Query must start with SELECT or WITH');
    });
    it('accepts SELECT and WITH (any case)', () => {
      expect(isValid('select * from financial_data')).toBe(true);
      expect(isValid('WITH t AS (SELECT 1 FROM financial_data) SELECT * FROM t')).toBe(true);
    });
  });

  describe('rule 2 — blocked keywords (word-boundary, mixed case)', () => {
    it.each([
      ['INSERT', "INSERT INTO financial_data VALUES ('x')"],
      ['UPDATE', 'UPDATE financial_data SET revenue = 0'],
      ['DELETE', 'DELETE FROM financial_data'],
      ['DROP', 'DROP TABLE financial_data'],
      ['ALTER', 'ALTER TABLE financial_data ADD COLUMN x int'],
      ['CREATE', 'CREATE TABLE x AS SELECT * FROM financial_data'],
      ['TRUNCATE', 'TRUNCATE financial_data'],
      ['GRANT', 'GRANT SELECT ON financial_data TO evil'],
      ['REVOKE', 'REVOKE SELECT ON financial_data FROM llm_reader'],
      ['COPY', 'COPY financial_data TO \x27/tmp/x\x27'],
      ['mixed-case DrOp', 'DrOp TaBlE financial_data'],
      ['mixed-case InSeRt', 'InSeRt INTO financial_data VALUES (1)'],
    ])('blocks %s', (_label, sql) => {
      expect(isValid(sql)).toBe(false);
    });
  });

  describe('rule 3 — single statement only', () => {
    it('blocks stacked statements', () => {
      const res = validator.validate('SELECT 1 FROM financial_data; DROP TABLE users');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Multiple SQL statements are not allowed');
    });
    it('allows a single trailing semicolon', () => {
      expect(isValid('SELECT * FROM financial_data;')).toBe(true);
    });
    it('does not count semicolons inside string literals', () => {
      expect(isValid("SELECT * FROM financial_data WHERE company = 'a;b;c'")).toBe(true);
    });
  });

  describe('rule 4 — must reference financial_data', () => {
    it('blocks a query with no financial_data reference', () => {
      const res = validator.validate('SELECT 1');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Query must reference the financial_data table');
    });
  });

  describe('rule 5 — no system/app tables (direct or via JOIN/UNION)', () => {
    it.each([
      ['users direct', 'SELECT * FROM users'],
      ['pg_catalog', 'SELECT * FROM pg_catalog.pg_tables'],
      ['pg_sleep', 'SELECT pg_sleep(10) FROM financial_data'],
      ['information_schema', 'SELECT table_name FROM information_schema.tables'],
      ['conversations', 'SELECT * FROM conversations'],
      ['messages', 'SELECT * FROM messages'],
      ['audit_logs', 'SELECT * FROM audit_logs'],
      [
        'UNION exfiltration',
        'SELECT company FROM financial_data UNION SELECT email FROM users',
      ],
      [
        'JOIN to users',
        'SELECT * FROM financial_data f JOIN users u ON true',
      ],
    ])('blocks %s', (_label, sql) => {
      expect(isValid(sql)).toBe(false);
    });
  });

  describe('rule 6 — no comments', () => {
    it.each([
      ['line comment', 'SELECT 1 FROM financial_data -- DROP TABLE users'],
      ['block comment', 'SELECT /* x */ 1 FROM financial_data'],
    ])('blocks %s', (_label, sql) => {
      const res = validator.validate(sql);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('SQL comments are not allowed');
    });
  });

  describe('legitimate queries MUST pass', () => {
    it.each([
      'SELECT * FROM financial_data',
      'SELECT company, revenue FROM financial_data WHERE year = 2024 ORDER BY revenue DESC LIMIT 5',
      'SELECT year, SUM(revenue) FROM financial_data GROUP BY year ORDER BY year',
      "SELECT AVG(net_income) FROM financial_data WHERE sector = 'Technology'",
      'WITH t AS (SELECT year, SUM(revenue) r FROM financial_data GROUP BY year) SELECT * FROM t ORDER BY year',
      "SELECT company FROM financial_data WHERE ticker = 'AAPL'",
      'select count(*) from financial_data',
    ])('accepts: %s', (sql) => {
      expect(validator.validate(sql)).toEqual({ valid: true, errors: [] });
    });
  });

  describe('strings containing blocked words as DATA pass (strengthening)', () => {
    it.each([
      "SELECT * FROM financial_data WHERE company = 'Drop Inc'",
      "SELECT * FROM financial_data WHERE company = 'Delete Corp'",
      "SELECT * FROM financial_data WHERE company ILIKE '%update%'",
      "SELECT * FROM financial_data WHERE company = 'Users United'",
      "SELECT * FROM financial_data WHERE company = 'pg_giant'",
    ])('accepts blocked-word-in-string: %s', (sql) => {
      expect(isValid(sql)).toBe(true);
    });
  });
});
