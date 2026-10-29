/** Page size used by platform, CRM, and accountant lists. */
export const LIST_PAGE_SIZE = 10;

/**
 * Client-side page slice. The APIs used by these panels return the full
 * collection, so this only limits what is rendered.
 */
export function paginate(items, page, pageSize) {
  const list = Array.isArray(items) ? items : [];
  const size = Number(pageSize) > 0 ? Number(pageSize) : LIST_PAGE_SIZE;
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (current - 1) * size;
  return {
    page: current,
    pageSize: size,
    totalPages,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
    rows: list.slice(start, start + size),
  };
}

/** Pagination is omitted when the filtered collection fits on one page. */
export function shouldShowPagination(total, pageSize) {
  const size = Number(pageSize) > 0 ? Number(pageSize) : LIST_PAGE_SIZE;
  return Number(total) > size;
}

/** At most `size` page numbers, sliding so the current page stays in view. */
export function visiblePageNumbers(page, totalPages, size = 5) {
  const total = Math.max(0, Math.floor(Number(totalPages) || 0));
  if (total <= 1) return [];
  const width = Math.min(Math.max(1, size), total);
  const current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), total);
  let start = Math.max(1, current - Math.floor(width / 2));
  const end = Math.min(total, start + width - 1);
  start = Math.max(1, end - width + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
