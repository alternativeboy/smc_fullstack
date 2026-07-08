import { type FormEvent, type KeyboardEvent, useState } from 'react';
import { Button } from '@/components/ui/button';

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
    <form onSubmit={submit} className="border-t bg-background p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask about the financial data…"
          disabled={disabled}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        {isStreaming ? (
          <Button type="button" variant="destructive" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={disabled}>
            Send
          </Button>
        )}
      </div>
    </form>
  );
}
