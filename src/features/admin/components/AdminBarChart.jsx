export default function AdminBarChart({
  items,
  valueKey,
  labelKey,
  formatValue,
  /** 'max' = widest bar is 100% (default). 'total' = bar width = % of sum of all values. */
  scale = 'max',
  onItemClick,
  selectedKey,
  getItemKey = (item) => item.role_id ?? item[labelKey],
}) {
  if (!items?.length) {
    return <div className="admin-empty">No data for this period.</div>;
  }

  const values = items.map((item) => Number(item[valueKey]) || 0);
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const denominator = scale === 'total' ? total : max;
  const clickable = typeof onItemClick === 'function';

  return (
    <div className="admin-bar-chart">
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const width = `${Math.max((value / denominator) * 100, value > 0 ? 4 : 0)}%`;
        const label = item[labelKey];
        const key = getItemKey(item);
        const selected = selectedKey != null && String(selectedKey) === String(key);
        const display = formatValue ? formatValue(value, item, { total, max }) : value;
        const rowClass = [
          'admin-bar-chart__row',
          clickable ? 'admin-bar-chart__row--clickable' : '',
          selected ? 'admin-bar-chart__row--selected' : '',
        ]
          .filter(Boolean)
          .join(' ');

        if (clickable) {
          return (
            <button
              key={`${key}-${value}`}
              type="button"
              className={rowClass}
              onClick={() => onItemClick(item)}
              aria-pressed={selected}
              aria-label={`Select ${label}`}
            >
              <span className="admin-bar-chart__label" title={label}>
                {label}
              </span>
              <div className="admin-bar-chart__track">
                <div className="admin-bar-chart__fill" style={{ width }} />
              </div>
              <span className="admin-bar-chart__value">{display}</span>
            </button>
          );
        }

        return (
          <div key={`${key}-${value}`} className={rowClass}>
            <span className="admin-bar-chart__label" title={label}>
              {label}
            </span>
            <div className="admin-bar-chart__track">
              <div className="admin-bar-chart__fill" style={{ width }} />
            </div>
            <span className="admin-bar-chart__value">{display}</span>
          </div>
        );
      })}
    </div>
  );
}
