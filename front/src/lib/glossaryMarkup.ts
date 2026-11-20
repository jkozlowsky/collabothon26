/**
 * Glossary definitions are plain text with inline links written as [[slug|visible text]].
 * [[slug]] alone shows the slug as the text. Anything that is not a complete, valid marker stays plain text.
 */
export type Segment = { type: 'text'; value: string } | { type: 'link'; slug: string; label: string };

const MARKER = /\[\[([a-z0-9-]+)(?:\|([^\]]*))?\]\]/g;

export function parseDefinition(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKER)) {
    if (match.index > last) segments.push({ type: 'text', value: text.slice(last, match.index) });
    const slug = match[1];
    const label = match[2]?.trim() ? match[2] : slug;
    segments.push({ type: 'link', slug, label });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ type: 'text', value: text.slice(last) });
  return segments;
}
