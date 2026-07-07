import * as Joi from 'joi';

/**
 * Boot-time env validation (NFR-013, GAP-006). ConfigModule runs this at
 * startup and throws if anything required is missing/invalid — the app fails
 * fast rather than booting into a broken state. `.env.example` is the source
 * of truth for the full list; keep them in sync.
 */
export const validationSchema = Joi.object({
  // App / runtime
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),

  // PostgreSQL — application user
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_POOL_SIZE: Joi.number().default(10),

  // PostgreSQL — llm_reader (SELECT-only role for LLM SQL)
  LLM_READER_USER: Joi.string().required(),
  LLM_READER_PASSWORD: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // OpenAI
  OPENAI_API_KEY: Joi.string().required(),
  OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),

  // JWT — access + refresh
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  REFRESH_TOKEN_TTL: Joi.number().default(604800),

  // Refresh cookie
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_SAMESITE: Joi.string().valid('strict', 'lax', 'none').default('strict'),
  COOKIE_PATH: Joi.string().default('/api/auth/refresh'),

  // Passwords — cost >= 12 enforced (CLAUDE.md §3 rule 5, NFR-012)
  BCRYPT_COST: Joi.number().min(12).default(12),

  // Usage / spending limit
  USAGE_LIMIT: Joi.number().default(1.0),
  USAGE_RESET_INTERVAL: Joi.number().default(3600),

  // Auth rate limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),

  // CORS
  CORS_ORIGIN: Joi.string().required(),

  // Frontend (Vite) — not consumed by the backend
  VITE_API_URL: Joi.string().optional(),
});
