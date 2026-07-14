import './PageHeader.css';

/**
 * Unified page header for every module.
 */
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  breadcrumb,
  actions,
  primaryAction,
  secondaryAction,
  className = '',
}) {
  const hasActions = actions || primaryAction || secondaryAction;

  return (
    <header className={`ui-page-header ${className}`.trim()}>
      <div className="ui-page-header__text">
        {breadcrumb ? (
          <nav className="ui-page-header__breadcrumb" aria-label="Breadcrumb">
            {breadcrumb}
          </nav>
        ) : null}
        {eyebrow ? <p className="ui-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle ? <p className="ui-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {hasActions ? (
        <div className="ui-page-header__actions">
          {secondaryAction}
          {primaryAction}
          {actions}
        </div>
      ) : null}
    </header>
  );
}
