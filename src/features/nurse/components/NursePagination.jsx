import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function NursePagination({
  page = 1,
  pageSize = 20,
  total,
  hasNextPage = false,
  itemCount = 0,
  onChange,
}) {
  const hasKnownTotal = total != null && Number.isFinite(total);
  const totalPages = hasKnownTotal ? Math.ceil(total / pageSize) || 1 : null;
  const canGoPrev = page > 1;
  const canGoNext = hasKnownTotal ? page < totalPages : hasNextPage;

  if (!canGoPrev && !canGoNext) {
    return null;
  }

  const start = itemCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = hasKnownTotal
    ? Math.min(page * pageSize, total)
    : (page - 1) * pageSize + itemCount;

  return (
    <div className="nurse-pagination">
      <p>
        {hasKnownTotal ? (
          <>
            Showing <strong>{start}</strong> to <strong>{end}</strong> of <strong>{total}</strong>
          </>
        ) : (
          <>
            Showing <strong>{start}</strong> to <strong>{end}</strong>
            {hasNextPage ? ' (more available)' : ''}
          </>
        )}
      </p>
      <div className="nurse-pagination__nav">
        <button
          type="button"
          className="nurse-pagination__btn"
          disabled={!canGoPrev}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          {hasKnownTotal ? `${page} / ${totalPages}` : `Page ${page}`}
        </span>
        <button
          type="button"
          className="nurse-pagination__btn"
          disabled={!canGoNext}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default memo(NursePagination);
