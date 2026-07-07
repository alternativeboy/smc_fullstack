-- Indexes for financial_data — documented in docs/erd.md §4
-- (Phase 0 ground-truth report §4 item 4). Runs after 01 loads the dump.
CREATE INDEX IF NOT EXISTS idx_financial_company_year ON financial_data (company, year);
CREATE INDEX IF NOT EXISTS idx_financial_sector       ON financial_data (sector);
CREATE INDEX IF NOT EXISTS idx_financial_ticker       ON financial_data (ticker);
