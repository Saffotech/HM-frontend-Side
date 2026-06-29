/** Highlight matching substring in search results */
export function highlightMatch(text, query) {
  if (!query?.trim() || !text) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function matchesQuery(text, query) {
  if (!query?.trim()) return true;
  return (text || '').toLowerCase().includes(query.toLowerCase().trim());
}
