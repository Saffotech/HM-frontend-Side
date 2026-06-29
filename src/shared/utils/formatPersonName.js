/**
 * Title-case a person's full name for display and storage.
 * e.g. "amaresh maurya" → "Amaresh Maurya"
 */
export function formatPersonName(value) {
  if (value == null || value === '') return '';
  return String(value)
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}
