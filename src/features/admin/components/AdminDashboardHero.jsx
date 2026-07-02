import { Building2, Users } from 'lucide-react';
import { Skeleton } from '@/shared/components/common';

function ActiveRing({ percent, isLoading }) {
  const safePercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;

  if (isLoading) {
    return <Skeleton width={88} height={88} circle />;
  }

  return (
    <div
      className="admin-ring"
      style={{ '--admin-ring-pct': `${safePercent}%` }}
      role="img"
      aria-label={`${safePercent}% of staff are active`}
    >
      <div className="admin-ring__inner">
        <span className="admin-ring__value">{safePercent}%</span>
        <span className="admin-ring__label">Active</span>
      </div>
    </div>
  );
}

export default function AdminDashboardHero({
  greeting,
  totalStaff,
  activeStaff,
  inactiveStaff,
  totalDepartments,
  isLoading,
}) {
  const activeRate =
    totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 0;

  return (
    <section className="admin-dashboard-hero">
      <div className="admin-dashboard-hero__main">
        <p className="admin-dashboard-hero__eyebrow">Hospital administration</p>
        <h1 className="admin-dashboard-hero__title">{greeting}</h1>
        <p className="admin-dashboard-hero__subtitle">
          Overview of staff accounts, departments, and role distribution across your hospital.
        </p>

        <div className="admin-dashboard-hero__highlights">
          <div className="admin-dashboard-hero__highlight">
            <Users size={16} aria-hidden />
            <span>
              <strong>{isLoading ? '—' : totalStaff}</strong> total staff
            </span>
          </div>
          <div className="admin-dashboard-hero__highlight">
            <Building2 size={16} aria-hidden />
            <span>
              <strong>{isLoading ? '—' : totalDepartments}</strong> active departments
            </span>
          </div>
        </div>
      </div>

      <div className="admin-dashboard-hero__metrics">
        <ActiveRing percent={activeRate} isLoading={isLoading} />
        <div className="admin-dashboard-hero__split">
          <div className="admin-dashboard-hero__metric">
            <span className="admin-dashboard-hero__metric-label">Active</span>
            <span className="admin-dashboard-hero__metric-value admin-dashboard-hero__metric-value--success">
              {isLoading ? '—' : activeStaff}
            </span>
          </div>
          <div className="admin-dashboard-hero__metric">
            <span className="admin-dashboard-hero__metric-label">Inactive</span>
            <span className="admin-dashboard-hero__metric-value">
              {isLoading ? '—' : inactiveStaff}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
