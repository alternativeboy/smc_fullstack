/**
 * FR-029 — the 49 companies in `financial_data`, keyed by the exact `company` value the
 * DB stores (which is what the LLM echoes into its answers).
 *
 * `search` is what we send to Google. It differs from the key wherever the DB name is
 * mashed or ambiguous ("JohnsonJohnson", "USB"), so the link lands on the real company
 * instead of a literal search for the stored string.
 *
 * This list is a frontend copy of DB state and can drift: a company added to
 * `financial_data` gets no link until it is added here. That is the accepted trade-off
 * for keeping FR-029 frontend-only — see PROGRESS.md (FR-029). The backend solves the
 * same problem at startup instead (FR-023).
 */
export const COMPANY_SEARCH_TERMS: Record<string, string> = {
  AbbVie: 'AbbVie',
  Adobe: 'Adobe',
  AMD: 'AMD',
  Amazon: 'Amazon',
  AmericanExpress: 'American Express',
  Amgen: 'Amgen',
  Apple: 'Apple',
  BankOfAmerica: 'Bank of America',
  BlackRock: 'BlackRock',
  'Bristol-Myers': 'Bristol-Myers Squibb',
  CapitalOne: 'Capital One',
  Chevron: 'Chevron',
  Citigroup: 'Citigroup',
  'Coca-Cola': 'Coca-Cola',
  Costco: 'Costco',
  'Eli Lilly': 'Eli Lilly',
  ExxonMobil: 'ExxonMobil',
  Goldman: 'Goldman Sachs',
  Google: 'Google',
  HomeDepot: 'Home Depot',
  Intel: 'Intel',
  JPMorgan: 'JPMorgan Chase',
  JohnsonJohnson: 'Johnson & Johnson',
  Mastercard: 'Mastercard',
  "McDonald's": "McDonald's",
  Merck: 'Merck',
  Meta: 'Meta Platforms',
  Microsoft: 'Microsoft',
  'Morgan Stanley': 'Morgan Stanley',
  Netflix: 'Netflix',
  Nike: 'Nike',
  Nvidia: 'Nvidia',
  Oracle: 'Oracle Corporation',
  PNC: 'PNC Financial Services',
  PayPal: 'PayPal',
  PepsiCo: 'PepsiCo',
  Pfizer: 'Pfizer',
  Salesforce: 'Salesforce',
  Schwab: 'Charles Schwab',
  Shopify: 'Shopify',
  Starbucks: 'Starbucks',
  Target: 'Target Corporation',
  Tesla: 'Tesla',
  USB: 'U.S. Bancorp',
  Uber: 'Uber',
  UnitedHealth: 'UnitedHealth Group',
  Visa: 'Visa Inc',
  Walmart: 'Walmart',
  WellsFargo: 'Wells Fargo',
};

export function googleSearchUrl(company: string): string {
  const term = COMPANY_SEARCH_TERMS[company] ?? company;
  return `https://www.google.com/search?q=${encodeURIComponent(term)}`;
}
