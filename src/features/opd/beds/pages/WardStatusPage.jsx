import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BedDouble, Building2, CheckCircle2, UserRound } from 'lucide-react';
import { useBedsByWardQuery } from '@/shared/hooks/queries/useBedsQuery';
import { Button, StatusBadge, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import './WardStatusPage.css';

export default function WardStatusPage() {
  const { wardName } = useParams();
  const { data: wardData, isLoading, isError, error } = useBedsByWardQuery(wardName);
  const wardBeds = wardData?.beds ?? [];
  const formattedWard = wardData?.wardName ?? (wardName ? wardName.charAt(0).toUpperCase() + wardName.slice(1) : '');

  if (isLoading || isError) {
    return <QueryFeedback isLoading={isLoading} isError={isError} error={error} />;
  }
  if (!wardBeds.length) return <div className="empty-state">Ward not found</div>;

  const stats = wardData?.stats;
  const occupied = stats?.occupied ?? wardBeds.filter((b) => b.status === 'Occupied').length;
  const available = stats?.available ?? wardBeds.length - occupied;
  const occupancyPct =
    wardData?.occupancyPercent ??
    (wardBeds.length > 0 ? Math.round((occupied / wardBeds.length) * 100) : 0);

  return (
    <div className="page-container page-stack ward-status-page">
      <div className="ward-banner">
        <Link to={ROUTES.BEDS} className="ward-banner__back">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} aria-hidden /> Back
          </Button>
        </Link>
        <div className="ward-banner__main">
          <div className="ward-banner__icon" aria-hidden>
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="ward-banner__title">{formattedWard} Ward</h2>
            <p className="ward-banner__subtitle">Live bed status for this ward</p>
          </div>
        </div>
        <span className="ward-banner__chip">{occupancyPct}% occupied</span>
      </div>

      <div className="ward-stats">
        <div className="ward-stat-card ward-stat-card--total">
          <span className="ward-stat-card__icon" aria-hidden>
            <BedDouble size={20} />
          </span>
          <div>
            <p className="ward-stat-card__label">Total</p>
            <p className="ward-stat-card__value">{wardBeds.length}</p>
          </div>
        </div>
        <div className="ward-stat-card ward-stat-card--free">
          <span className="ward-stat-card__icon" aria-hidden>
            <CheckCircle2 size={20} />
          </span>
          <div>
            <p className="ward-stat-card__label">Available</p>
            <p className="ward-stat-card__value">{available}</p>
          </div>
        </div>
        <div className="ward-stat-card ward-stat-card--occ">
          <span className="ward-stat-card__icon" aria-hidden>
            <UserRound size={20} />
          </span>
          <div>
            <p className="ward-stat-card__label">Occupied</p>
            <p className="ward-stat-card__value">{occupied}</p>
          </div>
        </div>
      </div>

      <div className="card ward-status-page__table-card">
        <div className="ward-table-card__head">
          <h3 className="ward-table-card__title">Beds in {formattedWard}</h3>
          <span className="ward-table-card__meta">{wardBeds.length} beds</span>
        </div>
        <div className="bed-table-wrap table-wrap">
          <table className="data-table ward-beds-table">
            <thead>
              <tr>
                <th>Bed</th>
                <th>Patient</th>
                <th className="col-optional">Department</th>
                <th className="col-optional">Admitted</th>
              </tr>
            </thead>
            <tbody>
              {wardBeds.map((bed) => (
                <tr
                  key={bed.bedNo}
                  className={bed.status === 'Available' ? 'ward-beds-table__row--free' : ''}
                >
                  <td>
                    <div className="ward-bed-cell">
                      <span className="bed-no-badge bed-no-badge--sm">
                        <BedDouble size={12} aria-hidden />
                        {bed.bedNo}
                      </span>
                      <StatusBadge status={bed.status} />
                    </div>
                  </td>
                  <td>
                    {bed.status === 'Occupied' ? (
                      <Link to={`/patients/${bed.patientId}/profile`} className="ward-beds-table__link ward-beds-table__patient">
                        <span className="ward-beds-table__patient-name">{bed.patientName}</span>
                        {bed.patientId && (
                          <span className="text-muted ward-beds-table__patient-id">{bed.patientId}</span>
                        )}
                      </Link>
                    ) : (
                      <span className="ward-beds-table__vacant">Vacant</span>
                    )}
                  </td>
                  <td className="col-optional">{bed.department || '—'}</td>
                  <td className="col-optional">{bed.admittedDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
