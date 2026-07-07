# ✅ Non-Functional Requirements — Financial Data Chat Assistant

> Source: `Full-Stack Engineer Take-Home Assignment.pdf`
> Date: 2026-07-06

---

## ⚡ Performance

| ID | Description | Priority | Source Section | Status |
|----|-------------|----------|----------------|--------|
| NFR-001 | Token-by-token streaming (low-latency UI updates) | Critical | §2 Streaming | `[ ]` |
| NFR-005 | Redis for cache / usage tracking | High | §5, §6 | `[ ]` |

---

## 🎨 Usability

| ID | Description | Priority | Source Section | Status |
|----|-------------|----------|----------------|--------|
| NFR-002 | Clean, polished UI — smooth streaming, tables/charts render correctly | High | §9 UI/UX (25%) | `[ ]` |

---

## 🔧 Maintainability

| ID | Description | Priority | Source Section | Status |
|----|-------------|----------|----------------|--------|
| NFR-003 | Well-separated code — clean auth/data isolation (NestJS modular architecture) | High | §9 Engineering (25%) | `[ ]` |
| NFR-004 | Docker Compose for PostgreSQL + Redis | High | §6 | `[ ]` |
| NFR-006 | Complete README — setup, data load, run, configuration | Medium | §8, §9 (10%) | `[ ]` |
| NFR-009 | Extensible architecture — NestJS modules can be extended during the live session | Medium | §7, §10 | `[ ]` |

---

## 🛡️ Reliability

| ID | Description | Priority | Source Section | Status |
|----|-------------|----------|----------------|--------|
| NFR-007 | No duplicate/missing messages after a browser refresh | High | §S5 | `[ ]` |
| NFR-008 | Chat history reloads in the correct order | High | §S5 | `[ ]` |
| NFR-010 | [IMPLICIT] API error handling — graceful error responses | High | — | `[ ]` |

---

## 🔒 Security

| ID | Description | Priority | Source Section | Status |
|----|-------------|----------|----------------|--------|
| NFR-011 | [IMPLICIT] Input validation — prevent SQL injection (TypeORM parameterized queries) | Critical | — | `[ ]` |
| NFR-012 | [IMPLICIT] Password hashing — never store plaintext passwords (bcrypt via NestJS) | Critical | — | `[ ]` |
| NFR-013 | [IMPLICIT] API key management — never hardcode the OpenAI API key (NestJS ConfigModule) | High | — | `[ ]` |
| NFR-014 | [IMPLICIT] Rate limiting — prevent API abuse (NestJS ThrottlerModule) | Medium | — | `[ ]` |

---

## Summary

| Priority | Count |
|----------|-------|
| Critical | 3 |
| High | 7 |
| Medium | 4 |
| **Total** | **14** |

> [!IMPORTANT]
> NFR-010 → NFR-014 are **IMPLICIT** requirements not stated in the assignment, but necessary for a production financial application.
> NestJS provides built-in modules covering these: `ThrottlerModule` (rate limiting), `ConfigModule` (secrets), `@nestjs/passport` (auth).
