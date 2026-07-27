/**
 * Resolve API-relative media paths (e.g. /uploads/...) to a browser URL.
 */

import { API_BASE_URL } from '@/shared/constants';

export function resolveMediaUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^(https?:|blob:|data:)/i.test(pathOrUrl)) return pathOrUrl;
  const base =
    API_BASE_URL ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
  return `${base}${pathOrUrl}`;
}
