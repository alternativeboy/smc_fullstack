// Shown while the assistant is querying, before any answer tokens arrive (v3 loading state).
export function StreamingIndicator() {
  return (
    <div className="flex flex-col gap-3 py-1" role="status" aria-label="Generating">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_8px_oklch(0.65_0.19_155_/_0.8)]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_8px_oklch(0.65_0.19_155_/_0.8)] [animation-delay:0.2s]" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_8px_oklch(0.65_0.19_155_/_0.8)] [animation-delay:0.4s]" />
        </span>
        <span className="font-mono text-[13px] font-semibold text-muted-foreground">
          Querying financial_data…
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-[15px] w-[480px] max-w-full rounded-lg bg-shimmer bg-[length:200%_100%] animate-shimmer" />
        <div className="h-[15px] w-[340px] max-w-full rounded-lg bg-shimmer bg-[length:200%_100%] animate-shimmer" />
      </div>
    </div>
  );
}
