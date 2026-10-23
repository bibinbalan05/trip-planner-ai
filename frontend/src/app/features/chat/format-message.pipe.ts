import { Pipe, PipeTransform } from '@angular/core';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline formatting. Input is already HTML-escaped. */
function formatInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

/**
 * Converts the small Markdown subset the assistant uses (headings, bullet and numbered lists,
 * bold, italics, inline code, horizontal rules) to HTML. Text is HTML-escaped first, and
 * Angular's [innerHTML] sanitizer runs afterwards as a second layer of protection.
 */
export function markdownToHtml(source: string): string {
  const lines = escapeHtml(source.replace(/\r\n/g, '\n')).split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let openList: 'ul' | 'ol' | null = null;

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.map(formatInline).join('<br>')}</p>`);
      paragraph = [];
    }
  };
  const closeList = (): void => {
    if (openList) {
      html.push(`</${openList}>`);
      openList = null;
    }
  };
  const startList = (type: 'ul' | 'ol'): void => {
    if (openList !== type) {
      closeList();
      html.push(`<${type}>`);
      openList = type;
    }
  };

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);

    if (line.trim() === '') {
      flushParagraph();
      closeList();
    } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph();
      closeList();
      html.push('<hr>');
    } else if (heading) {
      flushParagraph();
      closeList();
      // Chat bubbles are small: render # as h3, ## as h4, and so on (capped at h6).
      const level = Math.min(heading[1]!.length + 2, 6);
      html.push(`<h${level}>${formatInline(heading[2]!)}</h${level}>`);
    } else if (bullet) {
      flushParagraph();
      startList('ul');
      html.push(`<li>${formatInline(bullet[1]!)}</li>`);
    } else if (numbered) {
      flushParagraph();
      startList('ol');
      html.push(`<li>${formatInline(numbered[1]!)}</li>`);
    } else {
      closeList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  closeList();
  return html.join('');
}

@Pipe({ name: 'formatMessage', standalone: true })
export class FormatMessagePipe implements PipeTransform {
  transform(value: string): string {
    return markdownToHtml(value);
  }
}
