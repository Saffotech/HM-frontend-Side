import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/shared/components/common';

/* Legacy identifier preserved: AdminFilterPanel. Active name: ManagerFilterPanel. */
export default function ManagerFilterPanel({
  children,
  onReset,
  showReset = false,
  hideLabel = false,
}) {
  return (
    <div className={`admin-filter-panel${hideLabel ? ' admin-filter-panel--no-label' : ''}`}>
      {!hideLabel ? (
        <div className="admin-filter-panel__label">
          <Filter size={14} aria-hidden />
          Filters
        </div>
      ) : null}
      <div className="admin-filter-panel__controls">{children}</div>
      {showReset && onReset ? (
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          <RotateCcw size={14} aria-hidden />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
