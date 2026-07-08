// Matches the openapi UsageStatus schema.
export interface UsageStatus {
  currentSpend: number;
  limit: number;
  remaining: number;
  resetAt: string; // ISO date-time
  resetIntervalSeconds: number;
}
