/** Lightweight className joiner for IPD UI. */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}
