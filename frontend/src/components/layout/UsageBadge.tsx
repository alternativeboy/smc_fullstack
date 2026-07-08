import { useAuthStore } from '@/stores/auth.store';
import { useUsageStore } from '@/stores/usage.store';

function resetsIn(resetAt?: string): string | null {
  if (!resetAt) return null;
  const ms = new Date(resetAt).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const min = Math.ceil(ms / 60000);
  return min < 60 ? `${min} min` : `${Math.ceil(min / 60)} h`;
}

// Sidebar user + usage card (FR-021 spend display).
export function UsageBadge() {
  const user = useAuthStore((s) => s.user);
  const status = useUsageStore((s) => s.status);
  const label = user?.displayName ?? user?.email ?? 'You';
  const initials = label.slice(0, 2).toUpperCase();
  const reset = resetsIn(status?.resetAt);

  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald text-[13px] font-bold text-primary-foreground">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{label}</p>
        {status ? (
          <p className="truncate text-[11px] text-muted-foreground">
            ${status.currentSpend.toFixed(2)} of ${status.limit.toFixed(2)} used
            {reset ? ` · resets ~${reset}` : ''}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">Loading usage…</p>
        )}
      </div>
    </div>
  );
}
