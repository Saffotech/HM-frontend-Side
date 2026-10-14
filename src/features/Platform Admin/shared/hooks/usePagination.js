import { useState } from "react";

export function usePagination(items, pageSize = 8, resetKey = "") {
  const [page, setPage] = useState(1);
  const [seenKey, setSeenKey] = useState(resetKey);
  let currentPage = page;

  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setPage(1);
    currentPage = 1;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  if (currentPage > totalPages) {
    setPage(totalPages);
    currentPage = totalPages;
  }

  const start = (currentPage - 1) * pageSize;
  return {
    page: currentPage,
    setPage,
    pageSize,
    totalPages,
    total: items.length,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
    rows: items.slice(start, start + pageSize),
  };
}
