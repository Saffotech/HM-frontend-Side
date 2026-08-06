import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/features/ipd/utils/cn';

/**
 * Stat tile. Pass `to` to make the whole card a drill-down link into the
 * filtered list that the metric represents.
 */
export default function IpdStatCard({ label, value, icon: Icon, tone, to, loading = false }) {
  const body = (
    <>
      {Icon ? (
        <div className="ipd-stat-card__icon">
          <Icon size={18} aria-hidden />
        </div>
      ) : null}
      <div>
        <p className="ipd-stat-card__label">{label}</p>
        {loading ? (
          <div className="ipd-skeleton" style={{ width: '3rem', marginTop: '0.35rem' }} />
        ) : (
          <p
            className={cn(
              'ipd-stat-card__value',
              (value === null || value === undefined || value === '—') &&
                'ipd-stat-card__value--muted',
            )}
          >
            {value ?? '—'}
          </p>
        )}
      </div>
      {to ? <ArrowUpRight size={15} className="ipd-stat-card__go" aria-hidden /> : null}
    </>
  );

  if (!to) {
    return <div className={cn('ipd-stat-card', tone)}>{body}</div>;
  }

  return (
    <Link to={to} className={cn('ipd-stat-card', 'ipd-stat-card--action', tone)}>
      {body}
    </Link>
  );
}
