import { Link } from 'react-router-dom';
import { cn } from '@/features/ipd/utils/cn';

/**
 * Navigational action tile sized to match IpdStatCard inside the stat grid.
 */
export default function IpdActionCard({ label, description, to, icon: Icon, tone }) {
  return (
    <Link to={to} className={cn('ipd-stat-card', 'ipd-stat-card--action', tone)}>
      {Icon ? (
        <div className="ipd-stat-card__icon">
          <Icon size={18} aria-hidden />
        </div>
      ) : null}
      <div>
        <p className="ipd-stat-card__label">{label}</p>
        <p className="ipd-stat-card__action-text">{description}</p>
      </div>
    </Link>
  );
}
