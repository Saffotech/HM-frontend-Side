import { memo } from 'react';
import TablePagination from './TablePagination';
import './DataTableShell.css';

function DataTableShell({
  children,
  pagination,
  className = '',
  maxHeight,
}) {
  return (
    <div className={`data-table-shell ${className}`}>
      <div
        className="data-table-shell__scroll"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </div>
      {pagination && <TablePagination {...pagination} />}
    </div>
  );
}

export default memo(DataTableShell);
