import { ArrowUp, Square } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: Props) {
  const [text, setText] = useState('');

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t || isStreaming || disabled) return;
    onSend(t);
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={submit} className="flex-shrink-0 border-t px-8 pb-6 pt-4">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            'flex items-end gap-2 rounded-2xl border border-input bg-[oklch(0.97_0.006_90)] py-2 pl-4 pr-2 focus-within:ring-2 focus-within:ring-ring',
            disabled && 'opacity-60',
          )}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about the financial data…"
            disabled={disabled}
            className="flex-1 resize-none bg-transparent py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-destructive px-3.5 text-sm font-semibold text-destructive-foreground"
            >
              <Square className="h-3 w-3" fill="currentColor" /> Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !text.trim()}
              aria-label="Send"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-green transition-opacity disabled:opacity-40 disabled:shadow-none"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
