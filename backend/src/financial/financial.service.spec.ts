import { BadRequestException } from '@nestjs/common';
import { SqlValidatorService } from '../llm/services/sql-validator.service';
import { FinancialService } from './financial.service';

describe('FinancialService (Layer 2 + row cap)', () => {
  const llmReader = { query: jest.fn() };
  const validator = { validate: jest.fn() } as unknown as SqlValidatorService;
  let service: FinancialService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinancialService(llmReader as any, validator);
  });

  it('rejects invalid SQL before touching the DB (Layer 2 first)', async () => {
    (validator.validate as jest.Mock).mockReturnValue({ valid: false, errors: ['blocked'] });
    await expect(service.execute('DROP TABLE users')).rejects.toBeInstanceOf(BadRequestException);
    expect(llmReader.query).not.toHaveBeenCalled();
  });

  it('returns rows for a valid query', async () => {
    (validator.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
    llmReader.query.mockResolvedValue([{ company: 'Apple' }, { company: 'Google' }]);
    const res = await service.execute('SELECT company FROM financial_data');
    expect(res).toEqual({
      rows: [{ company: 'Apple' }, { company: 'Google' }],
      rowCount: 2,
      truncated: false,
    });
  });

  it('caps results at 200 rows and flags truncated', async () => {
    (validator.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
    llmReader.query.mockResolvedValue(Array.from({ length: 250 }, (_, i) => ({ i })));
    const res = await service.execute('SELECT * FROM financial_data f1, financial_data f2');
    expect(res.rows).toHaveLength(200);
    expect(res.rowCount).toBe(200);
    expect(res.truncated).toBe(true);
  });
});
