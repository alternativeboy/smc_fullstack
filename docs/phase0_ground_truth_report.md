# 🔎 Phase 0 — Ground-Truth Verification Report

> Date: 2026-07-07 · Author: assistant (agent) · Status: ✅ resolved (both mismatches actioned, human-approved)
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

| Column | erd.md type (as found → now) | Dump DDL type | Match |
|--------|------------------------------|---------------|:-----:|
| company | VARCHAR(255) | VARCHAR(255) | ✅ |
| ticker | ~~VARCHAR(10)~~ → **VARCHAR(255)** | VARCHAR(255) | ✅ (erd relaxed) |
| sector | ~~VARCHAR(50)~~ → **VARCHAR(255)** | VARCHAR(255) | ✅ (erd relaxed) |
| year | INTEGER | INTEGER | ✅ |
| revenue | BIGINT | BIGINT | ✅ |
| net_income | BIGINT | BIGINT | ✅ |
| operating_income | BIGINT | BIGINT | ✅ |
| gross_profit | BIGINT | BIGINT | ✅ |

**Mismatch 1 — VARCHAR lengths → ✅ RESOLVED.** As found, `erd.md` documented `ticker VARCHAR(10)`
and `sector VARCHAR(50)` while the provided dump declared both as `VARCHAR(255)`.
- Column **names and base types** (VARCHAR / INTEGER / BIGINT) all matched — only the declared
  lengths differed. The LLM system prompt only depends on names + base types, so the prompt was
  unaffected.
- The actual data fits either width (max ticker = 5 chars, max sector = 10 chars), so no
  truncation risk in any direction.
- **Resolution:** `erd.md` §4 relaxed to `ticker VARCHAR(255)` / `sector VARCHAR(255)` to match the
  provided dump (chosen over migrating the dump). NOT-NULL intent retained.

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
| Company **count** | ~~48~~ → **49** | **49** | ✅ (docs corrected) |
| Total rows | 192 | 192 | ✅ match |
| Years present | 2022–2025 | 2022–2025 | ✅ match |
| Sectors | Technology, Finance, Healthcare, Consumer, Energy | same 5 | ✅ match |

**Mismatch 2 — prose said 48 everywhere, but there are 49 companies → ✅ RESOLVED.**

- The dump contains **49 distinct companies**, and they match `prompt_spec.md`'s **enumerated
  list exactly** (set difference is empty both ways).
- `prompt_spec.md`'s own enumerated list already contained **49 names** (Tech 15 + Finance 15 +
  Healthcare 8 + Consumer 9 + Energy 2 = 49) — yet the same file's prose said "48 U.S. public
  companies." **The spec contradicted itself**; reality (49) matches the list, not the count.
- The "48" figure also appeared in the **system prompt**, the **tool description**, `erd.md` §4,
  `CLAUDE.md`, `README.md`, `compliance_requirements.md`, `functional_requirements.md`, and
  `openapi_spec.yaml`.
- **Row math:** 49 × 4 = 196 expected; two companies have only 2 of the 4 years —
  **BlackRock** (2022–2023 only) and **Shopify** (2024–2025 only) — so 196 − 4 = **192 rows**.
  The "192" total was correct, but the docs' stated reasoning ("48 × 4 = 192") was coincidental and
  wrong.
- **Resolution:** all "48" occurrences corrected to **49**, and `erd.md` §4's row-math updated to
  "49 × 4 − 4 = 192" with the BlackRock/Shopify explanation.

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

The system prompt previously hard-coded "Coverage: 48 U.S. public companies," and Scenario S2 had
the assistant tell users "My database covers **48** U.S. public companies" — **factually wrong**
against the actual data (49). Because grounding/no-hallucination is a graded, non-cuttable
requirement (FR-007, CR-003), the count was corrected to **49** across all docs (now applied).

**⚠️ Still open (separate, not yet approved):** the two partial-coverage companies
(**BlackRock** missing 2024–2025, **Shopify** missing 2022–2023) are real gaps in the data. The
system prompt's NULL-handling rule covers NULL *columns*, but not *missing rows* for a year — the
assistant should say "no data for that year" rather than imply the company doesn't exist. This
system-prompt rule was **not** part of the approved fix and remains a pending decision.

---

## 4. Recommendation → outcome (human-approved 2026-07-07)

1. ✅ **Applied.** Changed "48" → "49" in: `prompt_spec.md` (§1 prose + system prompt + §2 tool
   description + S2 example), `erd.md` §4 (+ row-math), `CLAUDE.md`, `README.md`,
   `compliance_requirements.md`, `functional_requirements.md`, `openapi_spec.yaml`.
2. ✅ **Applied.** Relaxed `erd.md` §4 `ticker`/`sector` to `VARCHAR(255)` to match the provided
   dump (chosen over migrating the dump). Data fits either way; NOT-NULL intent retained.
3. ⬜ **Open (not approved).** Add a missing-year rule to the system prompt for BlackRock
   (2024–2025) and Shopify (2022–2023) — see §3.
4. ⬜ **Optional / deferred to Phase 1.** Add the three documented indexes
   (`idx_financial_company_year`, `idx_financial_sector`, `idx_financial_ticker`) in the init/
   migration step.
