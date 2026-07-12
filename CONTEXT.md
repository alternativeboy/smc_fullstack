# 🗺️ CONTEXT — Verified state of the Financial Data Chat Assistant

> **What this file is:** a trustworthy snapshot of what the project **is and verifiably does
> right now** — only signed-off (✅) capabilities. It is deliberately *not* a status ledger.
>
> **Maintenance rule:** update this file **only when a feature is verified** (the human moves it
> 🔍 → ✅). Add it to the verified list + bump the "last updated" line, in the same change.
>
> **For live/in-flight status** (🚧/🔍, evidence, history) → [`PROGRESS.md`](PROGRESS.md).
> **For the rules/decisions** → [`CLAUDE.md`](CLAUDE.md). **To run it** → [`README.md`](README.md).
>
> Last updated: **2026-07-12** · reflects sign-off through **FR-028**.

---

## What it is

An AI chat app where users ask natural-language questions about the **income-statement data of
49 U.S. public companies (2022–2025)**. An LLM (OpenAI GPT-4o) answers **only** from PostgreSQL by
generating SQL through a single `execute_sql` tool. Answers stream token-by-token, the generated
SQL is shown, results render as tables/charts, and there's auth, per-user spending limits, and
conversation history. **Design goal: grounded answers, never invented numbers.**

---

## ✅ Verified capabilities

**Baseline (v1 — Phases 0–7, fresh-clone acceptance passed):**
- Grounded Q&A — every figure comes from a SQL result; missing data is stated, never fabricated (S2 verified live on gpt-4o).
- Token-by-token **streaming** (`fetch()` + `ReadableStream`) with **Stop** → partial saved + charged (S3/S5).
- **Visible SQL** tool call; markdown **tables** + Recharts **charts**.
- **Auth** — register/login, short-lived access JWT (in memory), httpOnly refresh cookie with single-use rotation + reuse detection, throttler, bcrypt ≥ 12.
- **User isolation** — every query scoped by JWT; a foreign id returns 404.
- **SQL guardrails (defense in depth)** — code validator (Layer 2) **and** SELECT-only `llm_reader` role (Layer 3).
- **Per-user usage limits** (Redis, TTL reset) with a friendly 429; fair partial billing on abort.
- **Append-only audit** for query / login / register / delete.
- All six scenarios **S1–S6** pass end-to-end (e2e + browser).

**Post-v1 (all ✅):**
- **FR-023** — system-prompt coverage generated at boot from the live DB + a startup schema guard.
- **FR-024** — UI/UX redesign: dark navy-teal sidebar + light chat, green→teal gradients, animations, streaming caret, shimmer loader, dark split-screen login.
- **FR-025** — conversations auto-title from the first user message.
- **FR-026** — copy-to-clipboard on the generated SQL and on completed answers.
- **FR-027** — mobile-responsive layout (sidebar → off-canvas drawer, no horizontal overflow).
- **FR-028** — example-prompt chips on the empty chat screen (send on click).

---

## Architecture at a glance

```
React (Vite, :5173) ──/api proxy──▶ NestJS API (:3000)
  useStreamChat (fetch+ReadableStream, SSE)   MessagesController (JWT + UsageLimit guards)
                                                 └▶ LlmService (OpenAI stream + tool loop)
                                                      └▶ FinancialService
                                                         ├ Layer 2: SqlValidatorService (regex allowlist)
                                                         └ Layer 3: llm_reader (SELECT-only role)  ─▶ PostgreSQL financial_data
  Zustand (access token in memory)            Redis (usage counters + refresh-token hashes)
```

**Five-layer guardrail on LLM SQL:** prompt → code validator → SELECT-only DB role (the real guarantee) → output check → append-only audit.

---

## Locked decisions (stable — see CLAUDE.md §2)

NestJS 10 + TypeORM migrations · PostgreSQL 15 · Redis 7 · OpenAI GPT-4o (streaming + tool-calling) ·
`fetch()`+`ReadableStream` transport (not EventSource) · access JWT **in memory** + refresh in an
httpOnly cookie · LLM SQL runs as **`llm_reader`** (SELECT-only) · conversations **soft-deleted** ·
React 18 + Vite + TS + Tailwind + Zustand.

---

## Codebase map (brief)

- `backend/src/` — feature modules: `auth`, `chat`, `financial`, `llm`, `usage`, `common`, `health`, `config` (+ `migrations/`, `test/` e2e)
- `frontend/src/` — `pages`, `components/{chat,sidebar,layout,ui}`, `hooks` (`useStreamChat`), `services`, `stores`
- `docs/` — binding specs (FR/NFR/CR/GAP, `erd.md`, `openapi_spec.yaml`, `prompt_spec.md`, `architecture_overview.md`)
- `docker-compose.yml` + `docker/postgres/` — Postgres (loads the dump + creates `llm_reader`) + Redis
- `data/financial_data.sql` — the provided dump (192 rows)

---

## Verified-state summary

**63 requirements ✅** · **3 deliberately deferred** (documented, not oversights):
- HTTPS/TLS → deployment concern (reverse proxy; `COOKIE_SECURE` + HSTS ready)
- Data retention/cleanup → out of scope (audit append-only; Redis TTL)
- PDPA consent + breach-notification → out of scope (erasure via soft-delete + disclosure done)

The project is **feature-complete and verified**; the only open items are the 3 above.

---

*Read `CLAUDE.md` for how it's built, `PROGRESS.md` for where each item stands, `README.md` to run it.*
