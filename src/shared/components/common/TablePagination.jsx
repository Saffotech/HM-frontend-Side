import { useState, useEffect, useCallback, useId } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import './TablePagination.css';

function getVisiblePages(current, total, maxVisible = 5) {
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  let end = start + maxVisible - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - maxVisible + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'items',
}) {
  const inputId = useId();
  const [goToValue, setGoToValue] = useState(String(page));

  useEffect(() => {
    setGoToValue(String(page));
  }, [page]);

  const goToPage = useCallback(
    (target) => {
      const next = Math.min(Math.max(1, target), totalPages);
      if (next !== page) onPageChange(next);
      setGoToValue(String(next));
    },
    [page, totalPages, onPageChange],
  );

  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const visiblePages = getVisiblePages(page, totalPages);

  const handleGoToSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(goToValue, 10);
    if (!Number.isNaN(parsed)) goToPage(parsed);
    else setGoToValue(String(page));
  };

  return (
    <nav className="table-pagination" aria-label="Table pagination">
      <p className="table-pagination__summary">
        Showing{' '}
        <strong>
          {start}–{end}
        </strong>{' '}
        of <strong>{totalItems}</strong>{' '}
        <span className="table-pagination__label">{itemLabel}</span>
      </p>

      <div className="table-pagination__nav" role="group" aria-label="Page navigation">
        <button
          type="button"
          className="table-pagination__nav-btn"
          disabled={page <= 1}
          onClick={() => goToPage(1)}
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft size={16} aria-hidden />
        </button>
        <button
          type="button"
          className="table-pagination__nav-btn"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={16} aria-hidden />
        </button>

        <div className="table-pagination__pages">
          {visiblePages.map((p) => (
            <button
              key={p}
              type="button"
              className={`table-pagination__page-btn${
                p === page ? ' table-pagination__page-btn--active' : ''
              }`}
              onClick={() => goToPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="table-pagination__nav-btn"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={16} aria-hidden />
        </button>
        <button
          type="button"
          className="table-pagination__nav-btn"
          disabled={page >= totalPages}
          onClick={() => goToPage(totalPages)}
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight size={16} aria-hidden />
        </button>
      </div>

      <form className="table-pagination__goto" onSubmit={handleGoToSubmit}>
        <label htmlFor={inputId} className="table-pagination__goto-label">
          Go to Page
        </label>
        <input
          id={inputId}
          type="number"
          min={1}
          max={totalPages}
          className="table-pagination__goto-input"
          value={goToValue}
          onChange={(e) => setGoToValue(e.target.value)}
          aria-label={`Go to page, 1 to ${totalPages}`}
        />
      </form>
    </nav>
  );
}
