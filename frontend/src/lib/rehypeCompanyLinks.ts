import type { Element, ElementContent, Root, RootContent } from 'hast';
import { COMPANY_SEARCH_TERMS, googleSearchUrl } from './companies';

/**
 * FR-029 — turns every known company name in the assistant's answer into a Google-search
 * link, in prose and in table cells alike.
 *
 * This runs on the parsed tree rather than on the markdown source: rewriting the source
 * string would linkify company names inside generated SQL and code fences, and injecting
 * anchor HTML would mean enabling raw-HTML rendering, which MarkdownRenderer deliberately
 * leaves off so LLM output can't inject markup. Walking text nodes keeps both properties.
 */

// Longest first, so "Morgan Stanley" wins over a bare "Morgan" if both were ever listed.
const NAMES = Object.keys(COMPANY_SEARCH_TERMS).sort((a, b) => b.length - a.length);

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Case-sensitive on purpose: the LLM echoes the DB's exact casing, and matching loosely
// would link ordinary words — "target the top 5", "meta commentary", "a visa".
const COMPANY_RE = new RegExp(`\\b(${NAMES.map(escapeRegex).join('|')})\\b`, 'g');

// Never linkify inside code/SQL, and never nest a link inside an existing one.
const SKIP_TAGS = new Set(['code', 'pre', 'a']);

function companyLink(name: string): Element {
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      href: googleSearchUrl(name),
      target: '_blank',
      // Without noopener the opened tab can reach back through window.opener.
      rel: ['noopener', 'noreferrer'],
    },
    children: [{ type: 'text', value: name }],
  };
}

/** Splits one text node into alternating plain-text and anchor nodes. */
function splitTextNode(value: string): ElementContent[] | null {
  COMPANY_RE.lastIndex = 0;
  const out: ElementContent[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = COMPANY_RE.exec(value)) !== null) {
    if (match.index > last) out.push({ type: 'text', value: value.slice(last, match.index) });
    out.push(companyLink(match[0]));
    last = match.index + match[0].length;
  }

  if (out.length === 0) return null;
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

export function rehypeCompanyLinks() {
  return (tree: Root) => {
    const walk = (node: Root | Element) => {
      const next: (RootContent | ElementContent)[] = [];
      let changed = false;

      for (const child of node.children) {
        if (child.type === 'text') {
          const parts = splitTextNode(child.value);
          if (parts) {
            next.push(...parts);
            changed = true;
            continue;
          }
        } else if (child.type === 'element' && !SKIP_TAGS.has(child.tagName)) {
          walk(child);
        }
        next.push(child);
      }

      if (changed) node.children = next as Element['children'];
    };

    walk(tree);
  };
}
