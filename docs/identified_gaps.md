# ⚠️ Identified Gaps — Financial Data Chat Assistant

> Source: `Full-Stack Engineer Take-Home Assignment.pdf`
> Date: 2026-07-06

---

## 🔴 Critical Gaps

| Gap ID | Missing Requirement | Expected Regulation | Risk Impact | NestJS Recommendation |
|--------|--------------------|--------------------|-------------|----------------------|
| GAP-001 | No SQL injection prevention strategy specified | OWASP, SOX §404 | Attackers could directly query/alter financial data | Use TypeORM parameterized queries; create `SqlValidationPipe` |
| GAP-002 | No authentication mechanism specified | Best Practice, PDPA | Unauthorized access to financial data | `@nestjs/passport` + `@nestjs/jwt` + Passport strategies |
| GAP-003 | No password storage strategy specified | PDPA, GDPR Art.32 | Password leak → account takeover | `bcrypt` via NestJS service, salt rounds ≥ 12 |
| GAP-004 | No data accuracy verification mechanism | SOX §302, SEC | Financial figures may be misleading if the LLM misinterprets SQL | Create `SqlValidatorService` enforcing SELECT-only queries |
| GAP-005 | No error handling strategy for OpenAI API failures | — | App crash/hang when the API is down or times out | NestJS `ExceptionFilter` + retry with `rxjs` operators |

---

## 🟡 High Gaps

| Gap ID | Missing Requirement | Recommendation | Risk Impact | NestJS Recommendation |
|--------|--------------------|---------------------------------|-------------|----------------------|
| GAP-006 | No API key rotation/management strategy | Use env vars, rotate periodically | Key leak → unauthorized API usage | `@nestjs/config` ConfigModule + `.env` files |
| GAP-007 | No rate limiting for registration/login | Implement a rate limiter | Brute-force attacks, resource abuse | `@nestjs/throttler` ThrottlerModule |
| GAP-008 | No audit logging for financial data queries | Log every query with user, timestamp, SQL | Cannot trace who viewed what data | NestJS `Interceptor` + Pino logger |
| GAP-009 | No HTTPS/TLS requirement | Enforce HTTPS, especially on auth endpoints | Credential interception (MITM); also required for `Secure` cookies | Helmet middleware + reverse proxy (nginx) |
| GAP-010 | No data retention policy for conversation history | Define a retention period, auto-cleanup | Data storage bloat, privacy risk | NestJS `@Cron()` scheduled cleanup task |

---

## 🟢 Medium Gaps

| Gap ID | Missing Requirement | Recommendation | NestJS Recommendation |
|--------|--------------------|---------------------------------|----------------------|
| GAP-011 | No CORS configuration | Restrict allowed origins to the frontend domain only. Because the refresh token is delivered via an httpOnly cookie, CORS **must** set `credentials: true` with an explicit origin allowlist (wildcard `*` is not permitted with credentials) | `app.enableCors({ origin: [FRONTEND_URL], credentials: true })` in `main.ts` |
| GAP-012 | No health check endpoint | Create a `/health` endpoint for monitoring | `@nestjs/terminus` TerminusModule + health indicators |
| GAP-013 | No database connection pooling strategy | Use a connection pool | TypeORM pool config: `{ max: 20, min: 5 }` |
| GAP-014 | No test strategy (unit/integration/e2e) | Write tests covering scenarios S1–S6 | NestJS testing utilities + Jest + Supertest |

---

## Summary

| Severity | Count | Action Required |
|----------|-------|----------------|
| 🔴 Critical | 5 | Must be addressed before development starts |
| 🟡 High | 5 | Should be addressed during the planning phase |
| 🟢 Medium | 4 | Address during development |
| **Total** | **14** | |

---

## 🗺️ Gap → NestJS Module Mapping

| Gap Group | NestJS Module/Pattern | Files to Create |
|-----------|----------------------|----------------|
| GAP-001, GAP-004 | `SqlModule` | `sql-validator.service.ts`, `sql-validation.pipe.ts` |
| GAP-002, GAP-003 | `AuthModule` | `auth.module.ts`, `auth.service.ts`, `jwt.strategy.ts` |
| GAP-005, GAP-010 | `CommonModule` | `http-exception.filter.ts`, `cleanup.service.ts` |
| GAP-006 | `ConfigModule` | `.env`, `config.ts` |
| GAP-007 | `ThrottlerModule` | `app.module.ts` (import) |
| GAP-008 | `LoggerModule` | `audit.interceptor.ts`, `logger.service.ts` |
| GAP-009 | Middleware | `main.ts` (helmet), `nginx.conf` |
| GAP-011 | CORS config | `main.ts` (`credentials: true` + origin allowlist) |
| GAP-012 | `HealthModule` | `health.controller.ts` |
| GAP-013 | TypeORM config | `ormconfig.ts` / `data-source.ts` |
| GAP-014 | Testing | `*.spec.ts`, `test/app.e2e-spec.ts` |
