import TablePagination from '@/shared/components/common/TablePagination';
import './Pagination.css';

/**
 * Unified pagination — wraps shared TablePagination with optional page-size control.
 */
export default function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'items',
  className = '',
}) {
  if (!totalPages || totalPages <= 1) {
    if (!onPageSizeChange) return null;
  }

  return (
    <div className={`ui-pagination ${className}`.trim()}>
      {onPageSizeChange ? (
        <label className="ui-pagination__size">
          <span className="ui-pagination__size-label">Rows</span>
          <select
            className="ui-pagination__size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {totalPages > 1 ? (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          itemLabel={itemLabel}
        />
      ) : null}
    </div>
  );
}
