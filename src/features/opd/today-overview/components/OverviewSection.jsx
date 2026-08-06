import PanelState from './PanelState';

/**
 * Card shell shared by every Today's Overview panel —
 * a compact header plus the standard loading / error / empty branches.
 */
export default function OverviewSection({
  title,
  subtitle,
  icon: Icon,
  action,
  isLoading = false,
  isError = false,
  error,
  isEmpty = false,
  emptyIcon,
  emptyTitle = 'Nothing to show yet',
  emptyDescription,
  skeletonRows = 4,
  className = '',
  children,
}) {
  return (
    <section className={`card today-overview__panel ${className}`.trim()}>
      <header className="today-overview__panel-head">
        {Icon ? (
          <span className="today-overview__panel-icon" aria-hidden>
            <Icon size={16} />
          </span>
        ) : null}
        <div className="today-overview__panel-title">
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action ? <div className="today-overview__panel-action">{action}</div> : null}
      </header>

      <PanelState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={isEmpty}
        emptyIcon={emptyIcon}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        skeletonRows={skeletonRows}
      >
        {children}
      </PanelState>
    </section>
  );
}
