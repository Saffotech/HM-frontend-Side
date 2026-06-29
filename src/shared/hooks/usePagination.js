import { useMemo, useState } from 'react';

export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const goToPage = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  const resetPage = () => setPage(1);

  return {
    page: safePage,
    totalPages,
    paginatedItems,
    goToPage,
    resetPage,
    totalItems: items.length,
    pageSize,
  };
}
