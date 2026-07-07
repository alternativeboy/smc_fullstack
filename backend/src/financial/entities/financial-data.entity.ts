import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * financial_data — FR-022 (erd.md §4). Read-only mapping; the table is loaded
 * from the provided dump (no migration). (company, year) is the natural key.
 * Only ever read via the llm_reader connection (Guardrail Layer 3).
 */
@Entity('financial_data')
export class FinancialData {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  company: string;

  @PrimaryColumn({ type: 'integer' })
  year: number;

  @Column({ type: 'varchar', length: 255 })
  ticker: string;

  @Column({ type: 'varchar', length: 255 })
  sector: string;

  @Column({ type: 'bigint', nullable: true })
  revenue: string | null;

  @Column({ name: 'net_income', type: 'bigint', nullable: true })
  netIncome: string | null;

  @Column({ name: 'operating_income', type: 'bigint', nullable: true })
  operatingIncome: string | null;

  @Column({ name: 'gross_profit', type: 'bigint', nullable: true })
  grossProfit: string | null;
}
