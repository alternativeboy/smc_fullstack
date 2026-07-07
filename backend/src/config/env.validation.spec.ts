import { validationSchema } from './env.validation';

// Minimal set of the required vars, enough to pass validation.
const complete = {
  DATABASE_HOST: 'localhost',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'postgres',
  DATABASE_NAME: 'financial_db',
  LLM_READER_USER: 'llm_reader',
  LLM_READER_PASSWORD: 'secret',
  REDIS_HOST: 'localhost',
  OPENAI_API_KEY: 'sk-test',
  JWT_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  CORS_ORIGIN: 'http://localhost:5173',
};

describe('env validationSchema (fail-fast — GAP-006/NFR-013)', () => {
  it('passes with all required vars and fills defaults', () => {
    const { error, value } = validationSchema.validate(complete);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.OPENAI_MODEL).toBe('gpt-4o-mini');
    expect(value.BCRYPT_COST).toBe(12);
    expect(value.COOKIE_PATH).toBe('/api/auth/refresh');
  });

  it('fails fast when OPENAI_API_KEY is missing (CR-014)', () => {
    const { OPENAI_API_KEY, ...rest } = complete;
    const { error } = validationSchema.validate(rest, { abortEarly: false });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/OPENAI_API_KEY/);
  });

  it('fails when a JWT secret is missing', () => {
    const { JWT_REFRESH_SECRET, ...rest } = complete;
    const { error } = validationSchema.validate(rest);
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/JWT_REFRESH_SECRET/);
  });

  it('rejects BCRYPT_COST below 12 (CLAUDE.md §3 rule 5)', () => {
    const { error } = validationSchema.validate({ ...complete, BCRYPT_COST: 8 });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/BCRYPT_COST/);
  });

  it('rejects an out-of-range COOKIE_SAMESITE value', () => {
    const { error } = validationSchema.validate({ ...complete, COOKIE_SAMESITE: 'bogus' });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/COOKIE_SAMESITE/);
  });
});
