import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/**
 * FR-006 — renders the assistant's markdown (GFM tables, code, lists). react-markdown
 * escapes raw HTML by default (no rehype-raw) so untrusted HTML is not injected.
 */
export function MarkdownRenderer({ content, caret }: { content: string; caret?: boolean }) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-foreground prose-p:my-2 prose-p:leading-relaxed prose-p:text-foreground prose-strong:text-foreground [&_td:first-child]:font-semibold',
        // While streaming, inline the last block so the blinking caret hugs the text.
        caret && '[&>*:nth-last-child(2)]:inline',
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => (
            <div className="my-3 overflow-hidden rounded-2xl border">
              <table className="w-full border-collapse text-[13.5px]" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-[oklch(0.97_0.006_90)]" {...props} />,
          th: ({ node, ...props }) => (
            <th
              className="px-4 py-3 text-left font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-muted-foreground"
              {...props}
            />
          ),
          td: ({ node, ...props }) => <td className="border-t px-4 py-3 text-foreground" {...props} />,
          a: ({ node, ...props }) => <a className="text-primary underline" {...props} />,
          code: ({ node, ...props }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12.5px]" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {caret && (
        <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-caret bg-foreground/60 align-baseline" />
      )}
    </div>
  );
}
