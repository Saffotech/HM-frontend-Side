import { memo } from 'react';
import DataTableShell from '@/shared/components/common/DataTableShell';
import Spinner from './Spinner';
import EmptyState from './EmptyState';
import './Table.css';

/**
 * Unified table shell — sticky header styling via .data-table, loading & empty states.
 */
function Table({
  children,
  columns,
  rows,
  renderRow,
  loading = false,
  emptyTitle = 'No data',
  emptyDescription = 'There is nothing to show yet.',
  emptyIcon,
  pagination,
  className = '',
  maxHeight,
  fillHeight = false,
}) {
  const hasDeclarative = Array.isArray(columns) && typeof renderRow === 'function';
  const isEmpty = hasDeclarative && (!rows || rows.length === 0);

  let body = children;

  if (loading) {
    body = (
      <div className="ui-table__state">
        <Spinner label="Loading table…" />
      </div>
    );
  } else if (hasDeclarative) {
    body = isEmpty ? (
      <div className="ui-table__state">
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      </div>
    ) : (
      <div className="table-wrap">
        <table className="data-table ui-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key || col.header} className={col.className}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows.map((row, index) => renderRow(row, index))}</tbody>
        </table>
      </div>
    );
  }

  return (
    <DataTableShell
      className={`ui-table-shell ${className}`.trim()}
      pagination={pagination}
      maxHeight={maxHeight}
      fillHeight={fillHeight}
    >
      {body}
    </DataTableShell>
  );
}

export default memo(Table);
