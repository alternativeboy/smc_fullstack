import { useUsageStore } from '@/stores/usage.store';

export function UsageBadge() {
  const status = useUsageStore((s) => s.status);
  if (!status) return null;

  const pct = status.limit > 0 ? Math.min(100, (status.currentSpend / status.limit) * 100) : 0;

  return (
    <div className="text-xs text-muted-foreground" title={`Resets ${new Date(status.resetAt).toLocaleString()}`}>
      <div>
        ${status.currentSpend.toFixed(4)} / ${status.limit.toFixed(2)}
      </div>
      <div className="mt-0.5 h-1 w-24 overflow-hidden rounded bg-muted">
        <div className="h-1 rounded bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
