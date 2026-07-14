import './FilterBar.css';

/**
 * Unified filter toolbar — search + filters + actions.
 */
export default function FilterBar({
  children,
  search,
  actions,
  className = '',
}) {
  return (
    <div className={`ui-filter-bar ${className}`.trim()}>
      {search ? <div className="ui-filter-bar__search">{search}</div> : null}
      {children ? <div className="ui-filter-bar__filters">{children}</div> : null}
      {actions ? <div className="ui-filter-bar__actions">{actions}</div> : null}
    </div>
  );
}
