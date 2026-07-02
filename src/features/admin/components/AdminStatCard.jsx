import { Skeleton } from '@/shared/components/common';

const TONE_CLASS = {
  primary: 'admin-stat-card--primary',
  success: 'admin-stat-card--success',
  warning: 'admin-stat-card--warning',
  danger: 'admin-stat-card--danger',
  info: 'admin-stat-card--info',
  neutral: 'admin-stat-card--neutral',
};

export default function AdminStatCard({
  title,
  value,
  subtitle,
  icon,
  isLoading = false,
  tone = 'neutral',
}) {
  return (
    <article className={`admin-stat-card ${TONE_CLASS[tone] || TONE_CLASS.neutral}`}>
      <div className="admin-stat-card__icon-wrap" aria-hidden>
        {icon}
      </div>
      <div className="admin-stat-card__content">
        <span className="admin-stat-card__label">{title}</span>
        {isLoading ? (
          <Skeleton height={28} width={64} />
        ) : (
          <div className="admin-stat-card__value">{value ?? '—'}</div>
        )}
        {subtitle && !isLoading ? (
          <span className="admin-stat-card__subtitle">{subtitle}</span>
        ) : null}
      </div>
    </article>
  );
}
