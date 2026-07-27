/** First letter capital — keep rest of user input as typed. */
export function capitalizeFirst(value) {
  const raw = String(value ?? '');
  if (!raw) return raw;
  const match = raw.match(/^(\s*)(\S)([\s\S]*)$/);
  if (!match) return raw;
  return `${match[1]}${match[2].toUpperCase()}${match[3]}`;
}

/** Display profile text with leading capital; skip email, dates, phone-like values. */
export function displayProfileText(value) {
  if (value == null || value === '') return value;
  const text = String(value);
  if (text.includes('@')) return text;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text;
  if (/^\+?\d[\d\s-]*$/.test(text.trim())) return text;
  return capitalizeFirst(text);
}

export function parseProfileLanguages(raw) {
  return [
    ...new Set(
      String(raw || '')
        .split(',')
        .map((s) => capitalizeFirst(s.trim()))
        .filter(Boolean)
    ),
  ];
}
