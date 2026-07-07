# ✅ Compliance Requirements — Financial Data Chat Assistant

> Source: `Full-Stack Engineer Take-Home Assignment.pdf`
> Date: 2026-07-06

---

## 📊 SOX (Sarbanes-Oxley Act)

**Rationale**: The system displays financial data of publicly traded companies (49 companies, income-statement data).

| ID | Regulation | Requirement Description | Implicit? | Priority | Status |
|----|------------|------------------------|-----------|----------|--------|
| CR-001 | SOX | Financial data accuracy — figures must come from a verifiable source | Yes | Critical | `[ ]` |
| CR-002 | SOX §802 | Immutable audit trail — no modification of financial data without a log | Yes | Critical | `[ ]` |
| CR-003 | SOX §302 | Data accuracy controls — displayed numbers must match the database | No | Critical | `[ ]` |
| CR-004 | SOX §404 | Internal controls — access control for financial data queries | Yes | High | `[ ]` |

---

## 🔐 PDPA (Personal Data Protection Act — Thailand)

**Rationale**: The system stores users' personal data (registration, login, conversation history).

| ID | Regulation | Requirement Description | Implicit? | Priority | Status |
|----|------------|------------------------|-----------|----------|--------|
| CR-005 | PDPA | Consent before collecting personal data (registration data) | Yes | High | `[ ]` |
| CR-006 | PDPA | Privacy policy disclosure — inform users what data is collected | Yes | High | `[ ]` |
| CR-007 | PDPA | Data subject rights — users can request account/data deletion | Yes | Medium | `[ ]` |
| CR-008 | PDPA | Data breach notification — notify users within 72 hours of a breach | Yes | High | `[ ]` |

---

## 🇪🇺 GDPR (General Data Protection Regulation)

**Rationale**: Applies if EU citizens use the system.

| ID | Regulation | Requirement Description | Implicit? | Priority | Status |
|----|------------|------------------------|-----------|----------|--------|
| CR-009 | GDPR | Data protection by design — encryption, pseudonymization | Yes | High | `[ ]` |
| CR-010 | GDPR Art.17 | Right to erasure — delete user data upon request | Yes | Medium | `[ ]` |
| CR-011 | GDPR Art.20 | Data portability — export data in a readable format | Yes | Low | `[ ]` |

---

## 📈 SEC (Securities and Exchange Commission)

**Rationale**: The data is income-statement data of companies listed on U.S. stock exchanges.

| ID | Regulation | Requirement Description | Implicit? | Priority | Status |
|----|------------|------------------------|-----------|----------|--------|
| CR-012 | SEC | Data accuracy for publicly traded company data — must not be misleading | Yes | Critical | `[ ]` |
| CR-013 | SEC | Disclosure — data source and coverage period must be stated clearly | Yes | High | `[ ]` |

---

## 🤖 OpenAI Terms of Service

**Rationale**: The system uses the OpenAI API for the LLM and tool-calling.

| ID | Regulation | Requirement Description | Implicit? | Priority | Status |
|----|------------|------------------------|-----------|----------|--------|
| CR-014 | OpenAI ToS | API key security — never expose the key in the frontend or logs | No | Critical | `[ ]` |
| CR-015 | OpenAI ToS | Usage tracking — track and limit API spend within budget ($10 cap) | No | High | `[ ]` |

---

## 🛡️ Security Best Practices

**Rationale**: Minimum standards for a web application handling financial data.

| ID | Regulation | Requirement Description | Implicit? | Priority | Status |
|----|------------|------------------------|-----------|----------|--------|
| CR-016 | Best Practice | Session management — secure token storage & expiration (access token in memory, refresh token in httpOnly cookie with rotation) | Yes | High | `[ ]` |
| CR-017 | Best Practice | CORS policy — restrict origins that may access the API (NestJS enableCors with `credentials: true`, explicit origin allowlist) | Yes | Medium | `[ ]` |
| CR-018 | Best Practice | Logging — audit log for query history and access patterns | Yes | Medium | `[ ]` |

---

## Summary

| Priority | Count |
|----------|-------|
| Critical | 5 |
| High | 8 |
| Medium | 4 |
| Low | 1 |
| **Total** | **18** |

| Regulation | Count |
|------------|-------|
| SOX | 4 |
| PDPA | 4 |
| GDPR | 3 |
| SEC | 2 |
| OpenAI ToS | 2 |
| Best Practice | 3 |
