/** Splits `text` around the first case-insensitive occurrence of `query` so the match can be highlighted. */
export function splitMatch(text: string, query: string): { before: string; match: string; after: string } {
  const q = query.trim();
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return { before: text, match: '', after: '' };
  return { before: text.slice(0, at), match: text.slice(at, at + q.length), after: text.slice(at + q.length) };
}
