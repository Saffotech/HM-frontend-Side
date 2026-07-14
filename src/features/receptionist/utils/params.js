/** Strip empty / "all" values before sending query params to backend */
export function cleanParams(params = {}) {
  const next = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (value === 'all') return;
    next[key] = value;
  });
  return next;
}

export const PAGE_SIZE_LIST = 10;

export function buildPagination(total, page, limit) {
  const safeLimit = limit > 0 ? limit : PAGE_SIZE_LIST;
  return {
    total: total ?? 0,
    page: page ?? 1,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil((total ?? 0) / safeLimit)),
  };
}
