/**
 * SR-220: clickable links in chat messages (contract docs/contracts/sr-218-chat.md, «Ссылки в тексте»).
 * Plain text in, parts out; the template prints them with {{ }} and <a [href]> — no HTML is ever built.
 */

export interface ChatLink {
  /** Normalised by `new URL()`, always http: or https:. */
  href: string;
  /** Exactly what the visitor typed. */
  label: string;
  host: string;
}

export type ChatTextPart = {text: string; link?: undefined} | {link: ChatLink; text?: undefined};

/** Start of a candidate: http:// or https://, any case. */
const SCHEME_RE = /https?:\/\//gi;
const WHITESPACE_RE = /\s/;
const WORD_CHAR_RE = /[\p{L}\p{N}_]/u;
/** Not part of a link when at its end. */
const TRAILING = new Set(['.', ',', ';', ':', '!', '?', ')', ']', '}', '»', '"', "'"]);

function parseLink(candidate: string): ChatLink | null {
  try {
    const url = new URL(candidate);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname || url.hostname === '.') return null;
    return {href: url.href, label: candidate, host: url.host};
  } catch {
    return null;
  }
}

export function splitLinks(text: string | null | undefined): ChatTextPart[] {
  if (!text) return [];
  const parts: ChatTextPart[] = [];
  let plain = '';
  let pos = 0;
  const flush = () => {
    if (plain) parts.push({text: plain});
    plain = '';
  };

  SCHEME_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SCHEME_RE.exec(text)) !== null) {
    const start = match.index;
    if (start < pos) continue;
    // "xhttps://…" — the scheme is glued to a word, not a link
    if (start > 0 && WORD_CHAR_RE.test(text[start - 1])) continue;
    let end = start + match[0].length;
    while (end < text.length && !WHITESPACE_RE.test(text[end])) end++;
    let linkEnd = end;
    while (linkEnd > start && TRAILING.has(text[linkEnd - 1])) linkEnd--;
    const link = linkEnd > start + match[0].length ? parseLink(text.slice(start, linkEnd)) : null;
    if (!link) {
      // not a valid address: the whole word stays text
      plain += text.slice(pos, end);
      pos = end;
      SCHEME_RE.lastIndex = end;
      continue;
    }
    plain += text.slice(pos, start);
    flush();
    parts.push({link});
    pos = linkEnd;
    SCHEME_RE.lastIndex = linkEnd;
  }
  plain += text.slice(pos);
  flush();
  return parts;
}
