import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  /** Text to place on the clipboard. */
  text: string;
  label?: string;
  className?: string;
  /** Show the label text next to the icon (icon-only by default). */
  withLabel?: boolean;
}

/** FR-026 — copy-to-clipboard with transient "copied" feedback. Requires a secure
 *  context (https or localhost); silently no-ops where the Clipboard API is absent. */
export function CopyButton({ text, label = 'Copy', className, withLabel }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable (non-secure context / permission) — no-op */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied!' : label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-semibold transition active:scale-95',
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {withLabel && (copied ? 'Copied' : label)}
    </button>
  );
}
