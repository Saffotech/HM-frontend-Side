import './StatCard.css';

/**
 * Unified KPI / metric card.
 */
export default function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'default',
  active = false,
  onClick,
  className = '',
}) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={[
        'ui-stat-card',
        `ui-stat-card--${tone}`,
        active ? 'ui-stat-card--active' : '',
        onClick ? 'ui-stat-card--clickable' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      {Icon ? (
        <div className="ui-stat-card__icon" aria-hidden>
          <Icon size={18} />
        </div>
      ) : null}
      <div className="ui-stat-card__content">
        <span className="ui-stat-card__label">{label}</span>
        <span className="ui-stat-card__value">{value}</span>
        {description ? (
          <span className="ui-stat-card__description">{description}</span>
        ) : null}
      </div>
    </Tag>
  );
}
