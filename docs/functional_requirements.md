# ✅ Functional Requirements — Financial Data Chat Assistant

> Source: `Full-Stack Engineer Take-Home Assignment.pdf`
> Date: 2026-07-06

---

## 🔵 Chat & AI Core

| ID | Description | Priority | Source Section | Status |
|----|-------------|----------|----------------|--------|
| FR-001 | Chat application — users can chat with an AI assistant about financial data | Critical | §2 Chat application | `[ ]` |
| FR-002 | React + TypeScript frontend | Critical | §5 Tech stack | `[ ]` |
| FR-003 | Backend API — NestJS (TypeScript) | Critical | §5 Tech stack | `[ ]` |
| FR-004 | Streaming — responses stream token-by-token | Critical | §2 Streaming | `[ ]` |
| FR-005 | SQL tool calls must be rendered visibly in the UI while executing | Critical | §2 Streaming | `[ ]` |
| FR-006 | Render Markdown correctly (tables, charts) | High | §2 Streaming | `[ ]` |
| FR-007 | Grounding — answers must come from the SQL database only; no hallucination | Critical | §2 Grounding | `[ ]` |
| FR-008 | When data is unavailable, state it clearly; never fabricate numbers | Critical | §2 Grounding, §S2 | `[ ]` |

---

## 🟡 Usage Limits

| ID | Description | Priority | Source Section | Status |
|----|-------------|----------|----------------|--------|
| FR-009 | Per-user spending limit (default $1) | High | §2 Usage limits | `[ ]` |
| FR-010 | Usage limit resets on a fixed interval (default 1 hour) | High | §2 Usage limits | `[ ]` |
| FR-011 | Configurable spending limit and reset interval | High | §2, §6 Usage tracking | `[ ]` |

---

## 🟢 Authentication & Isolation

| ID | Description | Priority | Source Section | Status |
|----|-------------|----------|----------------|--------|
| FR-012 | User registration | High | §2 Authentication, §7 | `[ ]` |
| FR-013 | User login | High | §2 Authentication, §7 | `[ ]` |
| FR-014 | User isolation — each user sees only their own conversations | Critical | §2 Authentication | `[ ]` |

---

## 🟣 Chat Management

| ID | Description | Priority | Source Section | Status |
|----|-------------|----------|----------------|--------|
| FR-015 | Stop response mid-generation | High | §2 Chat management, §S3 | `[ ]` |
| FR-016 | Partial messages must be saved to conversation history | High | §S3 | `[ ]` |
| FR-017 | Cost of partial responses must be deducted from the usage limit | High | §S3 | `[ ]` |
| FR-018 | Revisit past conversations | Medium | §2 Chat management | `[ ]` |
| FR-019 | Delete conversation — must ask for confirmation first | Medium | §2 Chat management, §S6 | `[ ]` |
| FR-020 | Browser refresh mid-conversation — history reloads correctly with no duplicates/losses | High | §S5 | `[ ]` |
| FR-021 | Exceeding the usage limit — reject with a friendly message, not a raw error | High | §S4 | `[ ]` |

---

## 🔴 Data Infrastructure

| ID | Description | Priority | Source Section | Status |
|----|-------------|----------|----------------|--------|
| FR-022 | PostgreSQL database loaded with financial_data.sql (49 companies, 2022-2025) | Critical | §4, §6 | `[ ]` |
| FR-023 | System prompt coverage (company list, sectors, year range) reflects the current `financial_data` contents at application startup; a schema guard fails loudly on column drift | High | derived (post-v1) | `[ ]` |
| FR-024 | UI/UX redesign of the frontend to the approved mockup (`frontend/design/`), preserving all functional components and grading-critical widgets (streaming, Stop, tool-call/SQL, tables/charts, sidebar, delete-confirm, usage badge) | Medium | derived (post-v1) | `[ ]` |

---

## Summary

| Priority | Count |
|----------|-------|
| Critical | 8 |
| High | 11 |
| Medium | 3 |
| **Total** | **22** |
