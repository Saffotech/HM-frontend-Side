import { Skeleton } from '@/components/ui';
import '@/components/ui/StatCard.css';

const TONE_CLASS = {
  primary: 'ui-stat-card--default',
  success: 'ui-stat-card--success',
  warning: 'ui-stat-card--warning',
  danger: 'ui-stat-card--danger',
  info: 'ui-stat-card--info',
  neutral: 'ui-stat-card--default',
};

/** Admin KPI card — shared StatCard visuals; icon is a React node. */
export default function AdminStatCard({
  title,
  value,
  subtitle,
  icon,
  isLoading = false,
  tone = 'neutral',
  onClick,
  isActive = false,
}) {
  const clickable = typeof onClick === 'function';
  const className = [
    'ui-stat-card',
    'admin-stat-card',
    TONE_CLASS[tone] || TONE_CLASS.neutral,
    clickable ? 'ui-stat-card--clickable' : '',
    isActive ? 'ui-stat-card--active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {icon ? (
        <div className="ui-stat-card__icon" aria-hidden>
          {icon}
        </div>
      ) : null}
      <div className="ui-stat-card__content">
        <span className="ui-stat-card__label">{title}</span>
        {isLoading ? (
          <Skeleton height={28} width={64} />
        ) : (
          <div className="ui-stat-card__value">{value ?? '—'}</div>
        )}
        {subtitle && !isLoading ? (
          <span className="ui-stat-card__description">{subtitle}</span>
        ) : null}
      </div>
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-pressed={isActive}
      >
        {content}
      </button>
    );
  }

  return <article className={className}>{content}</article>;
}
