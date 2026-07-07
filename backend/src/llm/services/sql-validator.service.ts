import { Injectable } from '@nestjs/common';

export interface SqlValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Guardrail Layer 2 (docs/prompt_spec.md §3) — a detective control that inspects
 * LLM-generated SQL before it runs. It is NOT the real guarantee (Layer 3, the
 * llm_reader SELECT-only role, is — CLAUDE.md §3 rule 2), but it must never
 * corrupt a legitimate query either.
 *
 * Strengthening over the raw-regex spec: keyword/table/semicolon/comment scans
 * run on a copy with string-literal CONTENTS blanked, so a blocked word that
 * appears as DATA (e.g. WHERE company = 'Drop Inc') is not a false positive.
 * Real comments/keywords/statements outside string literals are still caught.
 */
@Injectable()
export class SqlValidatorService {
  private readonly blockedKeywords = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'ALTER',
    'CREATE',
    'TRUNCATE',
    'GRANT',
    'REVOKE',
    'EXEC',
    'EXECUTE',
    'COPY',
    'LOAD',
    'IMPORT',
  ];

  private readonly blockedTables = [
    'pg_',
    'information_schema',
    'users',
    'conversations',
    'messages',
    'audit_logs',
  ];

  validate(sql: string): SqlValidationResult {
    const errors: string[] = [];
    const trimmed = (sql ?? '').trim();
    // Literal-safe view: '...' contents (with '' escapes) blanked to ''.
    const scan = trimmed.replace(/'(?:[^']|'')*'/g, "''");

    // Rule 1 — must start with SELECT or WITH.
    if (!/^\s*(select|with)\b/i.test(trimmed)) {
      errors.push('Query must start with SELECT or WITH');
    }

    // Rule 6 — no comments (checked on the literal-safe view).
    if (/--|\/\*/.test(scan)) {
      errors.push('SQL comments are not allowed');
    }

    // Rule 3 — single statement (semicolons inside strings don't count).
    const statements = scan
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (statements.length > 1) {
      errors.push('Multiple SQL statements are not allowed');
    }

    // Rule 2 — no blocked keywords (word-boundary, case-insensitive).
    for (const keyword of this.blockedKeywords) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(scan)) {
        errors.push(`Blocked keyword detected: ${keyword}`);
      }
    }

    // Rule 4 — must reference financial_data.
    if (!/\bfinancial_data\b/i.test(scan)) {
      errors.push('Query must reference the financial_data table');
    }

    // Rule 5 — no system/app tables (direct or via JOIN/UNION).
    for (const table of this.blockedTables) {
      if (new RegExp(`\\b${table}`, 'i').test(scan)) {
        errors.push(`Access to ${table} is not allowed`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
