import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { DataSource } from 'typeorm';
import { REQUIRED_COLUMNS, SYSTEM_PROMPT_TEMPLATE } from '../constants/system-prompt';
import { ConversationTurn } from '../interfaces/stream-event.interface';

/**
 * Builds the system prompt with a coverage block (company list, sectors, year range) derived
 * from the live `financial_data` table at startup (FR-023). Runs ONCE on boot against the
 * normal app connection — these are trusted, fixed, app-authored queries, NOT LLM-generated
 * SQL, so they do not go through SqlValidatorService / llm_reader. A schema guard fails the
 * boot loudly if the table's columns drift. Local scope: a restart is the refresh mechanism.
 */
@Injectable()
export class PromptBuilderService implements OnModuleInit {
  private readonly logger = new Logger(PromptBuilderService.name);
  private systemPrompt = SYSTEM_PROMPT_TEMPLATE;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.assertSchema();
    this.systemPrompt = await this.renderPrompt();
  }

  /** system prompt + prior turns + the new user message. */
  build(history: ConversationTurn[], userMessage: string): ChatCompletionMessageParam[] {
    return [
      { role: 'system', content: this.systemPrompt },
      ...history.map(
        (turn): ChatCompletionMessageParam => ({ role: turn.role, content: turn.content }),
      ),
      { role: 'user', content: userMessage },
    ];
  }

  /** Fail loudly at boot if financial_data's columns drift from docs/erd.md (FR-023). */
  private async assertSchema(): Promise<void> {
    const rows = await this.dataSource.query<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'financial_data'`,
    );
    const present = new Set(rows.map((r) => r.column_name));
    const required = REQUIRED_COLUMNS as readonly string[];
    const missing = required.filter((c) => !present.has(c));
    const unexpected = [...present].filter((c) => !required.includes(c));
    if (missing.length || unexpected.length) {
      throw new Error(
        `financial_data schema mismatch (FR-023 guard). ` +
          `Missing/renamed: [${missing.join(', ') || 'none'}]. Unexpected: [${unexpected.join(', ') || 'none'}]. ` +
          `A column change is a code change (validator allowlist + llm_reader GRANT + prompt), not a data reload.`,
      );
    }
  }

  /** Query the DB and substitute the coverage block + year values into the template. */
  private async renderPrompt(): Promise<string> {
    const yearRows = await this.dataSource.query<{ year: number }[]>(
      `SELECT DISTINCT year FROM financial_data ORDER BY year`,
    );
    const sectors = await this.dataSource.query<{ sector: string; companies: string[] }[]>(
      `SELECT sector, array_agg(DISTINCT company ORDER BY company) AS companies
       FROM financial_data GROUP BY sector ORDER BY sector`,
    );
    const [totals] = await this.dataSource.query<{ companies: number; rows: number }[]>(
      `SELECT COUNT(DISTINCT company)::int AS companies, COUNT(*)::int AS rows FROM financial_data`,
    );

    const years = yearRows.map((r) => Number(r.year));
    const yearRange = years.length
      ? years[0] === years[years.length - 1]
        ? `${years[0]}`
        : `${years[0]}-${years[years.length - 1]}`
      : 'the loaded fiscal years';
    const yearList =
      years.length > 1
        ? `${years.slice(0, -1).join(', ')}, or ${years[years.length - 1]}`
        : (years[0]?.toString() ?? 'the loaded fiscal years');

    const companyLines = sectors.map((s) => `${s.sector}: ${s.companies.join(', ')}`).join('\n');
    const coverageBlock =
      `Coverage: ${totals?.companies ?? 0} U.S. public companies across ${sectors.length} sectors, ` +
      `fiscal years ${yearRange}. Total rows: ${totals?.rows ?? 0}.\n\n` +
      `## Companies Available\n${companyLines}`;

    this.logger.log(
      `System-prompt coverage: ${totals?.companies ?? 0} companies, ${sectors.length} sectors, ` +
        `years ${yearRange} (${totals?.rows ?? 0} rows).`,
    );

    return SYSTEM_PROMPT_TEMPLATE.replace('{{COVERAGE_BLOCK}}', coverageBlock)
      .replace(/\{\{YEAR_LIST\}\}/g, yearList)
      .replace(/\{\{YEAR_RANGE\}\}/g, yearRange);
  }
}
