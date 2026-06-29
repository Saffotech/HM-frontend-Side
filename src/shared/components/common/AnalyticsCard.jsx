import './AnalyticsCard.css';

export default function AnalyticsCard({
  label,
  value,
  icon: Icon,
  color = 'blue',
  active = false,
  onClick,
  sublabel,
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`analytics-card analytics-card--${color} ${active ? 'analytics-card--active' : ''}`}
      onClick={onClick}
    >
      {Icon && (
        <div className="analytics-card__icon">
          <Icon size={18} />
        </div>
      )}
      <div className="analytics-card__content">
        <span className="analytics-card__label">{label}</span>
        <span className="analytics-card__value analytics-card__value--money">{value}</span>
        {sublabel && <span className="analytics-card__sub">{sublabel}</span>}
      </div>
    </Tag>
  );
}
