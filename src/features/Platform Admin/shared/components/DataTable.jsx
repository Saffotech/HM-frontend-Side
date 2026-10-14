import EmptyState from "./EmptyState";
import "./DataTable.css";

export default function DataTable({
  columns,
  rows,
  rowKey = "id",
  sortKey,
  sortDirection,
  onSort,
  emptyTitle,
  emptyMessage,
  selectable = false,
  selected = [],
  onToggle,
  onToggleAll,
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {selectable && (
              <th>
                <input
                  type="checkbox"
                  aria-label="Select all rows on this page"
                  checked={rows.length > 0 && rows.every((row) => selected.includes(row[rowKey]))}
                  onChange={(event) => onToggleAll(event.target.checked, rows.map((row) => row[rowKey]))}
                />
              </th>
            )}
            {columns.map((column) => (
              <th key={column.key}>
                {column.sortable && onSort ? (
                  <button type="button" className="sort-btn" onClick={() => onSort(column.key)}>
                    {column.label} {sortKey === column.key ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                  </button>
                ) : column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="table-empty">
              <td colSpan={columns.length + (selectable ? 1 : 0)}>
                <EmptyState title={emptyTitle} message={emptyMessage} />
              </td>
            </tr>
          ) : rows.map((row) => (
            <tr key={row[rowKey]}>
              {selectable && (
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.name || row[rowKey]}`}
                    checked={selected.includes(row[rowKey])}
                    onChange={(event) => onToggle(row[rowKey], event.target.checked)}
                  />
                </td>
              )}
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
