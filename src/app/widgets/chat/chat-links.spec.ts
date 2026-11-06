import {ChatTextPart, splitLinks} from './chat-links';

const text = (t: string): ChatTextPart => ({text: t});

describe('splitLinks (SR-220: links in chat messages)', () => {
  it('plain text is one text part; empty text is no parts', () => {
    expect(splitLinks('Есть 75B?')).toEqual([text('Есть 75B?')]);
    expect(splitLinks('')).toEqual([]);
    expect(splitLinks(null)).toEqual([]);
    expect(splitLinks(undefined)).toEqual([]);
  });

  it('http and https links become link parts with href, label and host', () => {
    expect(splitLinks('see https://secretroom.md/ro/product/12/bra now')).toEqual([
      text('see '),
      {link: {href: 'https://secretroom.md/ro/product/12/bra', label: 'https://secretroom.md/ro/product/12/bra', host: 'secretroom.md'}},
      text(' now'),
    ]);
    expect(splitLinks('http://example.com')).toEqual([
      {link: {href: 'http://example.com/', label: 'http://example.com', host: 'example.com'}},
    ]);
  });

  it('several links, text between them kept as is', () => {
    const parts = splitLinks('a https://a.md b\nhttp://b.md:8080/x?q=1 c');
    expect(parts.map(p => p.link?.host ?? p.text)).toEqual(['a ', 'a.md', ' b\n', 'b.md:8080', ' c']);
  });

  it('trailing punctuation is not part of the link', () => {
    for (const tail of ['.', ',', ';', ':', '!', '?', ')', ']', '}', '»', '"', "'", '...', '?!', ').']) {
      const parts = splitLinks(`go https://a.md/x${tail}`);
      expect(parts).withContext(tail).toEqual([
        text('go '),
        {link: {href: 'https://a.md/x', label: 'https://a.md/x', host: 'a.md'}},
        text(tail),
      ]);
    }
  });

  it('link in parentheses or quotes', () => {
    const parts = splitLinks('(https://a.md) «https://b.md»');
    expect(parts.filter(p => p.link).map(p => p.link!.label)).toEqual(['https://a.md', 'https://b.md']);
    expect(parts.map(p => p.link?.label ?? p.text).join('')).toBe('(https://a.md) «https://b.md»');
  });

  it('other schemes stay text', () => {
    for (const s of [
      'javascript:alert(1)',
      'JavaScript:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'mailto:a@b.md',
      'ftp://a.md/x',
      '//evil.md/x',
    ]) {
      expect(splitLinks(s)).withContext(s).toEqual([text(s)]);
    }
  });

  it('HTML in the text stays text; only a real http(s) address inside becomes a link', () => {
    for (const s of [
      '<a href=javascript:alert(1)>x</a>',
      '"><img src=x onerror=alert(1)>',
      '<script>alert(1)</script>',
      '<a href="javascript:alert(1)">click</a>',
    ]) {
      expect(splitLinks(s)).withContext(s).toEqual([text(s)]);
    }
  });

  it('never yields a non-http(s) href', () => {
    const parts = splitLinks('x https://a.md/"><img src=x onerror=alert(1)> javascript:https://b.md');
    for (const p of parts.filter(q => q.link)) {
      expect(new URL(p.link!.href).protocol).toMatch(/^https?:$/);
    }
    expect(parts.map(p => p.link?.label ?? p.text).join(''))
      .toBe('x https://a.md/"><img src=x onerror=alert(1)> javascript:https://b.md');
  });

  it('a scheme glued to a word is not a link; a bare scheme is text', () => {
    expect(splitLinks('xhttps://a.md')).toEqual([text('xhttps://a.md')]);
    expect(splitLinks('https:// nothing')).toEqual([text('https:// nothing')]);
    expect(splitLinks('https://.')).toEqual([text('https://.')]);
  });

  it('upper-case scheme is a link (URL normalises it)', () => {
    expect(splitLinks('HTTPS://A.MD/X')).toEqual([
      {link: {href: 'https://a.md/X', label: 'HTTPS://A.MD/X', host: 'a.md'}},
    ]);
  });
});
