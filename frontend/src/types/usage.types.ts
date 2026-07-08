// openapi UsageStatus.
export interface UsageStatus {
  currentSpend: number;
  limit: number;
  remaining: number;
  resetAt: string;
  resetIntervalSeconds: number;
}
