import Button from './Button';
import './EmptyState.css';

/**
 * Unified empty state.
 * icon: Lucide component — OR iconNode: pre-rendered element
 */
export default function EmptyState({
  icon: Icon,
  iconNode,
  title,
  description,
  action,
  onAction,
  actionLabel,
  className = '',
}) {
  const buttonLabel = actionLabel || (typeof action === 'string' ? action : null);

  return (
    <div className={`ui-empty-state ${className}`.trim()}>
      {(Icon || iconNode) && (
        <div className="ui-empty-state__icon" aria-hidden>
          {iconNode || (Icon ? <Icon size={40} strokeWidth={1.5} /> : null)}
        </div>
      )}
      {title ? <h3 className="ui-empty-state__title">{title}</h3> : null}
      {description ? (
        <p className="ui-empty-state__description">{description}</p>
      ) : null}
      {buttonLabel && onAction ? (
        <Button type="button" onClick={onAction} className="ui-empty-state__action">
          {buttonLabel}
        </Button>
      ) : null}
      {action && typeof action !== 'string' && !onAction ? action : null}
    </div>
  );
}
