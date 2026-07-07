# 🛠️ Tech Stack Decision — Financial Data Chat Assistant

> Date: 2026-07-06
> Project Type: AI-powered financial data chat application
> Core Domain: LLM + SQL query engine for income-statement data of U.S. public companies

---

## Stack Overview

| Layer | Technology | Version | Justification | Requirement |
|-------|-----------|---------|---------------|-------------|
| Frontend | React + TypeScript | 18+ | Required by assignment, strong ecosystem for streaming UI | FR-002 |
| UI Library | Tailwind CSS + shadcn/ui | 3.x / latest | Rapid prototyping, polished UI per grading rubric (25% UI/UX) | NFR-002 |
| Markdown | react-markdown + remark-gfm | latest | Render tables and code blocks from LLM responses | FR-006 |
| Charts | Recharts | 2.x | Lightweight charting for financial data comparison | FR-006 |
| Backend | NestJS (TypeScript) | 10+ | Modular architecture, built-in Guards/Pipes/Interceptors, extensible | FR-003, NFR-003, NFR-009 |
| ORM | TypeORM | 0.3+ | Parameterized queries (SQL injection prevention), migration support | NFR-011, GAP-001 |
| Database | PostgreSQL | 15+ | Required — provided `financial_data.sql` is in pg_dump format | FR-022 |
| Cache | Redis | 7+ | Atomic usage tracking with TTL, refresh-token store | NFR-005, FR-009, CR-016 |
| LLM | OpenAI API (GPT-4o) | latest | Required — API key provided, tool-calling support | FR-007 |
| LLM SDK | openai (Node.js) | 4+ | Official SDK, streaming support, TypeScript types | FR-004 |
| Auth | @nestjs/passport + @nestjs/jwt | latest | JWT Bearer auth, multiple strategies, NestJS integration | FR-012, FR-013, GAP-002 |
| Cookies | cookie-parser | latest | Parse the httpOnly refresh-token cookie on `/auth/refresh` and `/auth/logout` | CR-016 |
| Password | bcrypt | 5+ | Industry standard, configurable cost factor | NFR-012, GAP-003 |
| Validation | class-validator + class-transformer | latest | DTO validation, NestJS Pipe integration | NFR-011 |
| Rate Limit | @nestjs/throttler | latest | Built-in NestJS rate limiting | NFR-014, GAP-007 |
| Config | @nestjs/config | latest | Environment-based config, type-safe | NFR-013, GAP-006 |
| Health | @nestjs/terminus | latest | Health check indicators (DB, Redis) | GAP-012 |
| Logging | nestjs-pino (Pino) | latest | Structured JSON logging, fast, audit trail | CR-018, GAP-008 |
| Container | Docker Compose | 3.8+ | Local dev stack: PostgreSQL + Redis | NFR-004 |
| Testing | Jest + Supertest | latest | NestJS default, unit + e2e testing | GAP-014 |

---

## Decision Rationale

### Why NestJS instead of plain Express/Fastify?
- **Modular architecture** — each feature is a separate module (Auth, Chat, LLM, Usage) per NFR-003
- **Built-in patterns** — Guards (auth), Pipes (validation), Interceptors (logging), Filters (error handling) address GAP-001 through GAP-008 with framework patterns instead of hand-rolled code
- **Extensible in the live session** — assignment §10 states the project will be extended live; NestJS's module system makes adding features easy (NFR-009)
- **TypeScript first** — type safety across the entire stack (frontend + backend)

### Why TypeORM instead of Prisma?
- **Parameterized queries** — critical for preventing SQL injection from LLM-generated queries (GAP-001)
- **Raw query support** — LLM-generated SQL must be executed via the `query()` method with parameter binding
- **Migration support** — schema management for additional entities

### Why Redis for usage tracking?
- **Atomic operations** — `INCRBYFLOAT` + `TTL` keep the spending limit accurate even under concurrent requests
- **Auto-reset** — TTL expiry = automatic spending reset per interval (FR-010)
- **No cron needed** — Redis TTL manages the reset window by itself

### Why Redis for refresh-token storage? (CR-016)
- **Rotation & reuse detection** — each refresh token is stored server-side (hashed) so it can be revoked and single-use rotation can be enforced; a reused token indicates theft and triggers revocation of the whole session family
- **TTL alignment** — refresh-token lifetime maps directly to a Redis key TTL, no cleanup jobs required
- **No schema change** — avoids adding a `refresh_tokens` table to PostgreSQL for a take-home-scale project

### Why the hybrid token storage model (access in memory + refresh in httpOnly cookie)?
- **XSS containment** — the refresh token is unreadable by JavaScript (`httpOnly`); the access token, while in memory, is short-lived (~15 min), limiting the blast radius of a stolen token
- **CSRF surface minimized** — the cookie is scoped to `Path=/api/auth/refresh` with `SameSite=Strict`, so only the refresh endpoint needs CSRF consideration
- **Bearer scheme preserved** — all API calls (including fetch-stream) still use `Authorization: Bearer`, keeping the API usable by non-browser clients

### Why GPT-4o?
- **Tool-calling** — native function-calling support for the `execute_sql` tool
- **Streaming** — supports `stream: true` with usage reporting
- **Accuracy** — best SQL generation accuracy (FR-007, CR-003)
- **Cost** — $2.50/1M input, $10/1M output — comfortably within the $10 budget

---

## Alternatives Considered

| Technology | Pros | Why Not Chosen |
|-----------|-------|------------------|
| Express.js | Lightweight, simple | No module system; everything wired by hand; poor fit for an extensible architecture (NFR-009) |
| Prisma | Type-safe queries, great DX | Weaker raw-query execution support than TypeORM for LLM-generated SQL |
| SQLite | Simple, no Docker needed | Assignment specifies PostgreSQL + pg_dump format |
| gpt-4o-mini | 16x cheaper | Lower SQL generation accuracy, higher hallucination risk (FR-007) |
| LangChain | Framework for LLM apps | Over-engineering for a single-tool use case; adds an unnecessary abstraction layer |
| Vercel AI SDK | Streaming helpers | Good, but locks into the Vercel ecosystem; NestJS SSE is straightforward to implement directly |
| MongoDB | Flexible schema | Assignment provides PostgreSQL; financial data needs ACID compliance |
| localStorage for tokens | Simplest implementation | Both tokens readable by any script — unacceptable XSS exposure for a financial app |
| httpOnly cookies for both tokens (BFF) | Strongest XSS protection | Requires CSRF defense on every endpoint; conflicts with the BearerAuth scheme in the OpenAPI spec; heavier than needed |
