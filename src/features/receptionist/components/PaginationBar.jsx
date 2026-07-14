import { Pagination } from '@/components/ui';

/** Adapter — receptionist pages use currentPage / itemsPerPage naming. */
export default function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
}) {
  return (
    <Pagination
      page={currentPage}
      totalPages={totalPages}
      totalItems={totalItems ?? 0}
      pageSize={itemsPerPage}
      onPageChange={onPageChange}
      itemLabel="results"
    />
  );
}
