import { Injectable } from '@nestjs/common';

export interface OutputValidationResult {
  valid: boolean;
  warnings: string[];
}

/**
 * Guardrail Layer 4 (docs/prompt_spec.md §3) — LOG-ONLY. Flags responses that
 * contain figures with no supporting query result. It never blocks output.
 */
@Injectable()
export class OutputValidatorService {
  validate(response: string, queryResults: unknown[]): OutputValidationResult {
    const warnings: string[] = [];
    const numbers = response.match(/\$?[\d,]+(?:\.\d+)?\s*(?:billion|million|B|M)?/gi) ?? [];
    if (queryResults.length === 0 && numbers.length > 0) {
      warnings.push('Response contains numbers but the query returned no results');
    }
    return { valid: warnings.length === 0, warnings };
  }
}
