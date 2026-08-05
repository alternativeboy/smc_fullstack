import { useEffect, useState } from 'react';
import type { StreamPhase } from '@/types/chat.types';

// Only surface a timer once the wait is long enough to feel like one — below this
// the number appears and vanishes as noise.
const ELAPSED_AFTER_MS = 3000;

const LABELS: Record<StreamPhase, string> = {
  thinking: 'Working out the query…',
  querying: 'Running the query…',
  composing: 'Writing the answer…',
};

/** Ticks once a second while mounted; the indicator unmounts as soon as tokens arrive. */
function useElapsed(startedAt?: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return startedAt ? now - startedAt : 0;
}

interface Props {
  phase?: StreamPhase;
  /** Rows returned by the query just run — shown once we move on to the answer. */
  rowCount?: number;
  startedAt?: number;
}

/**
 * FR-030 — the pending state names the phase the turn is actually in (derived
 * from the stream events in useStreamChat) and shows elapsed seconds on a long
 * wait, so a slow answer reads as progress rather than a hang.
 */
export function StreamingIndicator({ phase = 'thinking', rowCount, startedAt }: Props) {
  const elapsed = useElapsed(startedAt);
  const seconds = Math.floor(elapsed / 1000);
  const label = LABELS[phase];
  const detail = phase === 'composing' && rowCount !== undefined
    ? `${rowCount} row${rowCount === 1 ? '' : 's'} returned`
    : null;

  return (
    <div className="flex flex-col gap-3 py-1" role="status" aria-live="polite" aria-label={label}>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_8px_oklch(0.65_0.19_155_/_0.8)]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_8px_oklch(0.65_0.19_155_/_0.8)] [animation-delay:0.2s]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_8px_oklch(0.65_0.19_155_/_0.8)] [animation-delay:0.4s]" />
        </span>
        <span className="font-mono text-[13px] font-semibold text-muted-foreground">{label}</span>
        {detail && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11.5px] font-semibold text-secondary-foreground">
            {detail}
          </span>
        )}
        {elapsed >= ELAPSED_AFTER_MS && (
          <span className="font-mono text-[12px] tabular-nums text-muted-foreground/70">{seconds}s</span>
        )}
      </div>
      <div className="space-y-2">
        <div className="h-[15px] w-[480px] max-w-full rounded-lg bg-shimmer bg-[length:200%_100%] animate-shimmer" />
        <div className="h-[15px] w-[340px] max-w-full rounded-lg bg-shimmer bg-[length:200%_100%] animate-shimmer" />
      </div>
    </div>
  );
}
