import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Pagination } from '@/components/ui';

/**
 * Nurse list pagination — supports known totals via shared Pagination,
 * or cursor-style prev/next when only hasNextPage is known.
 */
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

  if (hasKnownTotal) {
    return (
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={onChange}
      />
    );
  }

  const canGoPrev = page > 1;
  const canGoNext = hasNextPage;
  if (!canGoPrev && !canGoNext) return null;

  const start = itemCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = (page - 1) * pageSize + itemCount;

  return (
    <nav className="ui-pagination nurse-pagination" aria-label="Pagination">
      <p className="text-description">
        Showing <strong>{start}</strong> to <strong>{end}</strong>
        {hasNextPage ? ' (more available)' : ''}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          iconOnly
          disabled={!canGoPrev}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          leftIcon={ChevronLeft}
        />
        <span className="text-body">Page {page}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          iconOnly
          disabled={!canGoNext}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          leftIcon={ChevronRight}
        />
      </div>
    </nav>
  );
}

export default memo(NursePagination);
