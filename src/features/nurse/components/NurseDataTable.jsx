import { memo } from 'react';
import { EmptyState } from '@/shared/components/common';

function NurseDataTable({ columns, data, isLoading, emptyMessage, onRowClick, rowClassName }) {
  if (isLoading) {
    return (
      <div className="nurse-card nurse-table-wrap">
        <table className="nurse-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.header}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((row) => (
              <tr key={row}>
                {columns.map((_, i) => (
                  <td key={i}>
                    <div className="nurse-skeleton-line" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="nurse-card">
        <EmptyState title="No records found" description={emptyMessage || 'There is no data to display.'} />
      </div>
    );
  }

  return (
    <div className="nurse-card nurse-table-wrap">
      <table className="nurse-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.header}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id ?? row.history_id}
              className={[
                row.priority === 'emergency' ? 'nurse-row--emergency' : '',
                onRowClick ? 'nurse-row--clickable' : '',
                rowClassName?.(row) ?? '',
              ].filter(Boolean).join(' ')}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (e.key === ' ') e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
            >
              {columns.map((col) => (
                <td key={col.header}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(NurseDataTable);
