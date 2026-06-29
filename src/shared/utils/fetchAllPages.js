/**
 * Fetch all pages from a paginated API (frontend-only aggregation).
 */

export async function fetchAllPages(fetchPage, { pageSize = 100, maxPages = 50 } = {}) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    const result = await fetchPage(page, pageSize);
    items.push(...(result.items ?? []));
    const total = result.total ?? items.length;
    totalPages = result.totalPages ?? Math.max(1, Math.ceil(total / pageSize));
    if ((result.items ?? []).length === 0) break;
    page += 1;
  }

  return items;
}

export function totalPagesFrom(total, limit) {
  return Math.max(1, Math.ceil((total ?? 0) / (limit || 1)));
}
