import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// VERBATIM from docs/prompt_spec.md §2. Update the spec first, then re-copy.
export const EXECUTE_SQL_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'execute_sql',
    description:
      'Execute a read-only SQL SELECT query against the financial_data table in PostgreSQL. The table contains income-statement data (company, ticker, sector, year, revenue, net_income, operating_income, gross_profit) for 49 U.S. public companies from 2022 to 2025. All monetary values are in USD (BIGINT). Some values may be NULL.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'A PostgreSQL SELECT query against the financial_data table. Must be a single SELECT statement. Examples: "SELECT company, revenue FROM financial_data WHERE year = 2024 ORDER BY revenue DESC LIMIT 5", "SELECT year, net_income FROM financial_data WHERE ticker = \'AAPL\'"',
        },
      },
      required: ['query'],
    },
  },
};
