import { DataSource } from 'typeorm';
import { PromptBuilderService } from './prompt-builder.service';

const ALL_COLUMNS = [
  'company',
  'ticker',
  'sector',
  'year',
  'revenue',
  'net_income',
  'operating_income',
  'gross_profit',
];

// Fake DataSource whose `query` answers each boot query by matching the SQL.
function fakeDataSource(columns: string[]): DataSource {
  return {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('information_schema.columns')) {
        return columns.map((c) => ({ column_name: c }));
      }
      if (sql.includes('DISTINCT year')) {
        return [{ year: 2022 }, { year: 2023 }, { year: 2024 }, { year: 2025 }];
      }
      if (sql.includes('array_agg')) {
        return [
          { sector: 'Technology', companies: ['Apple', 'Google'] },
          { sector: 'Finance', companies: ['JPMorgan'] },
        ];
      }
      if (sql.includes('COUNT(DISTINCT company)')) {
        return [{ companies: 49, rows: 192 }];
      }
      return [];
    }),
  } as unknown as DataSource;
}

describe('PromptBuilderService', () => {
  it('fills the coverage block + year values from the DB (no placeholders left)', async () => {
    const svc = new PromptBuilderService(fakeDataSource(ALL_COLUMNS));
    await svc.onModuleInit();

    const [system] = svc.build([], 'hi');
    const content = system.content as string;

    expect(content).toContain('Coverage: 49 U.S. public companies across 2 sectors');
    expect(content).toContain('Total rows: 192');
    expect(content).toContain('Technology: Apple, Google');
    expect(content).toContain('Fiscal year: 2022, 2023, 2024, or 2025');
    expect(content).toContain('My data only covers 2022-2025');
    expect(content).not.toContain('{{'); // every placeholder substituted
  });

  it('threads the streamed message after the system prompt', async () => {
    const svc = new PromptBuilderService(fakeDataSource(ALL_COLUMNS));
    await svc.onModuleInit();
    const msgs = svc.build([{ role: 'user', content: 'prev' }], 'now');
    expect(msgs[0].role).toBe('system');
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'now' });
  });

  it('refuses to boot when a required column is missing/renamed', async () => {
    const missingRevenue = ALL_COLUMNS.filter((c) => c !== 'revenue');
    const svc = new PromptBuilderService(fakeDataSource(missingRevenue));
    await expect(svc.onModuleInit()).rejects.toThrow(/schema mismatch[\s\S]*revenue/);
  });

  it('refuses to boot on an unexpected extra column', async () => {
    const svc = new PromptBuilderService(fakeDataSource([...ALL_COLUMNS, 'ebitda']));
    await expect(svc.onModuleInit()).rejects.toThrow(/Unexpected:[\s\S]*ebitda/);
  });
});
