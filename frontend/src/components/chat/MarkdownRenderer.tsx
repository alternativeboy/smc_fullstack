import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * FR-006 — renders the assistant's markdown (GFM tables, code, lists). react-markdown
 * escapes raw HTML by default (no rehype-raw) so untrusted HTML is not injected.
 */
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-pre:my-2 prose-table:my-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => <th className="border bg-muted px-2 py-1 text-left font-medium" {...props} />,
          td: ({ node, ...props }) => <td className="border px-2 py-1" {...props} />,
          a: ({ node, ...props }) => <a className="text-primary underline" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
