import { useState } from "react";
import { paginate } from "./paginationMath";

export { LIST_PAGE_SIZE, paginate, shouldShowPagination, visiblePageNumbers } from "./paginationMath";

/**
 * Paginate an in-memory array. `resetKey` returns to page 1 when search,
 * filters, sorting, or the relevant tab change. A shrinking result set
 * clamps the current page instead of leaving it past the last page.
 */
export function usePagination(items, pageSize = 8, resetKey = "") {
  const [page, setPage] = useState(1);
  const [seenKey, setSeenKey] = useState(resetKey);
  let current = page;

  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setPage(1);
    current = 1;
  }

  const result = paginate(items, current, pageSize);
  if (result.page !== current) setPage(result.page);

  return { ...result, setPage };
}
