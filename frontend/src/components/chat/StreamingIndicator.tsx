export function StreamingIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 py-1" role="status" aria-label="Generating">
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0.2s]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:0.4s]" />
    </span>
  );
}
