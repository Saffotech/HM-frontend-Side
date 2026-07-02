import { memo } from 'react';
import TablePagination from './TablePagination';
import './DataTableShell.css';

function DataTableShell({
  children,
  pagination,
  className = '',
  maxHeight,
  fillHeight = false,
}) {
  return (
    <div
      className={`data-table-shell${fillHeight ? ' data-table-shell--fill' : ''} ${className}`.trim()}
    >
      <div
        className="data-table-shell__scroll"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </div>
      {pagination && (
        <div className="data-table-shell__footer">
          <TablePagination {...pagination} />
        </div>
      )}
    </div>
  );
}

export default memo(DataTableShell);
