export function trimForm(data) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
  );
}
