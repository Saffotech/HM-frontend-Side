import { useEffect } from 'react';

/** Step back when a page fetch returns no rows (prevents empty ghost pages). */
export function useNursePagedListGuard({ isLoading, page, items, onPageChange }) {
  useEffect(() => {
    if (!isLoading && page > 1 && (items?.length ?? 0) === 0) {
      onPageChange(page - 1);
    }
  }, [isLoading, page, items, onPageChange]);
}
