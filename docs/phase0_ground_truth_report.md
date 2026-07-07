# 🔎 Phase 0 — Ground-Truth Verification Report

> Date: 2026-07-07 · Author: assistant (agent) · Status: ready for human review
> Source dump: `data/financial_data.sql` (md5 `b04bff3880dfc125209370488074260e`, 192 data rows)
> Compared against: `docs/erd.md` §4, `docs/prompt_spec.md` §1/§2

**This is a findings report.** Per CLAUDE.md §7 and the Phase-0 task brief, the discrepancies
below were surfaced first and **not** auto-fixed. The dump itself was never modified.

> ✅ **RESOLVED (2026-07-07, human-approved).** Both mismatches were actioned:
> 1. Company count corrected **48 → 49** in `prompt_spec.md` (§1 prose + system prompt + §2 tool
>    description + S2 example), `erd.md` §4 (+ row-math), `CLAUDE.md`, `README.md`,
>    `compliance_requirements.md`, `functional_requirements.md`, `openapi_spec.yaml`.
> 2. `erd.md` `ticker`/`sector` relaxed **VARCHAR(10)/(50) → VARCHAR(255)** to match the provided
>    dump (chosen over migrating the dump). NOT-NULL intent retained.
>
> The missing-year system-prompt rule (§3 below) was **not** part of this approval and remains open.

---

## 1. Schema — `financial_data` (dump DDL vs `erd.md` §4)

- **Table name:** `financial_data` — ✅ match
- **Columns:** 8 columns, same names, same order — ✅ match

| Column | erd.md type | Dump DDL type | Match |
|--------|-------------|---------------|:-----:|
| company | VARCHAR(255) | VARCHAR(255) | ✅ |
| ticker | **VARCHAR(10)** | **VARCHAR(255)** | ❌ length |
| sector | **VARCHAR(50)** | **VARCHAR(255)** | ❌ length |
| year | INTEGER | INTEGER | ✅ |
| revenue | BIGINT | BIGINT | ✅ |
| net_income | BIGINT | BIGINT | ✅ |
| operating_income | BIGINT | BIGINT | ✅ |
| gross_profit | BIGINT | BIGINT | ✅ |

**Mismatch 1 — VARCHAR lengths.** `erd.md` documents `ticker VARCHAR(10)` and
`sector VARCHAR(50)`; the provided dump declares both as `VARCHAR(255)`.
- Column **names and base types** (VARCHAR / INTEGER / BIGINT) all match — only the declared
  lengths differ. The LLM system prompt only depends on names + base types, so **the prompt is
  unaffected**.
- The actual data fits the stricter ERD lengths (max ticker = 5 chars, max sector = 10 chars),
  so ERD's lengths are data-compatible — no truncation risk if aligned later.

**Informational — constraints & indexes.** The provided dump has **no** `NOT NULL`, no primary
key, and no indexes. `erd.md` documents `company/ticker/sector/year` as `NOT NULL` plus three
indexes (`idx_financial_company_year`, `idx_financial_sector`, `idx_financial_ticker`). The data
satisfies the `NOT NULL` intent (those four columns are never null). This is expected for a raw
`pg_dump` load; a Phase-1 migration could add constraints/indexes if desired. Not counted as a
type mismatch.

---

## 2. Company list & row count (dump vs `prompt_spec.md`)

| Check | Docs say | Dump actually has | Result |
|-------|----------|-------------------|:------:|
| Company **names** (per sector) | see `prompt_spec.md` §1 | identical set | ✅ exact match |
| Company **count** | **48** | **49** | ❌ mismatch |
| Total rows | 192 | 192 | ✅ match |
| Years present | 2022–2025 | 2022–2025 | ✅ match |
| Sectors | Technology, Finance, Healthcare, Consumer, Energy | same 5 | ✅ match |

**Mismatch 2 — company count is 48 everywhere in prose, but there are 49 companies.**

- The dump contains **49 distinct companies**, and they match `prompt_spec.md`'s **enumerated
  list exactly** (set difference is empty both ways).
- `prompt_spec.md`'s own enumerated list already contains **49 names** (Tech 15 + Finance 15 +
  Healthcare 8 + Consumer 9 + Energy 2 = 49) — yet the same file's prose says "48 U.S. public
  companies" (lines 28 & 82). **The spec contradicts itself**; reality (49) matches the list, not
  the count.
- The "48" figure also appears in the **system prompt** ("Coverage: 48 …"), the **tool
  description**, `erd.md` §4, `CLAUDE.md`, and `README.md`.
- **Row math:** 49 × 4 = 196 expected; two companies have only 2 of the 4 years —
  **BlackRock** (2022–2023 only) and **Shopify** (2024–2025 only) — so 196 − 4 = **192 rows**.
  The "192" total is correct, but the docs' stated reasoning ("48 × 4 = 192") is coincidental and
  wrong.

Per-sector company counts in the dump:

| Sector | Count | Companies |
|--------|:-----:|-----------|
| Technology | 15 | AMD, Adobe, Amazon, Apple, Google, Intel, Meta, Microsoft, Netflix, Nvidia, Oracle, Salesforce, Shopify, Tesla, Uber |
| Finance | 15 | AmericanExpress, BankOfAmerica, BlackRock, CapitalOne, Citigroup, Goldman, JPMorgan, Mastercard, Morgan Stanley, PNC, PayPal, Schwab, USB, Visa, WellsFargo |
| Healthcare | 8 | AbbVie, Amgen, Bristol-Myers, Eli Lilly, JohnsonJohnson, Merck, Pfizer, UnitedHealth |
| Consumer | 9 | Coca-Cola, Costco, HomeDepot, McDonald's, Nike, PepsiCo, Starbucks, Target, Walmart |
| Energy | 2 | Chevron, ExxonMobil |

---

## 3. Why Mismatch 2 matters (grounding accuracy)

The system prompt hard-codes "Coverage: 48 U.S. public companies." Scenario S2 has the assistant
tell users "My database covers **48** U.S. public companies." That statement would be **factually
wrong** against the actual data (49). Because grounding/no-hallucination is a graded, non-cuttable
requirement (FR-007, CR-003), this count should be corrected to **49** across all docs — but that
is a docs change for the human to approve, not an agent auto-fix.

Also worth a human note: the two partial-coverage companies (**BlackRock** missing 2024–2025,
**Shopify** missing 2022–2023) are real gaps in the data. The system prompt's NULL-handling rule
covers NULL *columns*, but not *missing rows* for a year — the assistant should say "no data for
that year" rather than imply the company doesn't exist.

---

## 4. Recommendation (for human decision — not applied)

1. Change "48" → "49" in: `prompt_spec.md` (§1 prose + system prompt + §2 tool description),
   `erd.md` §4, `CLAUDE.md`, `README.md`.
2. Fix the row-count explanation to "49 companies × 4 years − 4 missing (BlackRock 2×, Shopify 2×)
   = 192."
3. Decide whether to align the dump's `ticker`/`sector` to `VARCHAR(10)`/`VARCHAR(50)` via a
   Phase-1 migration, or relax `erd.md` to `VARCHAR(255)` to match the provided dump. (Data fits
   either way.)
4. Optionally add the three documented indexes in the Phase-1 init/migration step.
