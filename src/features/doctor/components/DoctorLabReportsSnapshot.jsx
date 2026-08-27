import { useEffect, useMemo, useState } from 'react';
import { Beaker, Calendar, Eye } from 'lucide-react';
import NurseHistoryFilter from '@/features/nurse/components/NurseHistoryFilter';
import StatusPill from '@/features/doctor/components/StatusPill';
import { Button } from '@/shared/components/common';
import '../styles/doctor-patient-clinical.css';

function formatLabFilterDate(test) {
  if (!test) return '—';
  const when = test.orderedDisplay || '—';
  const name = String(test.testName ?? '').trim();
  const status = String(test.doctorStatus ?? test.status ?? '').trim();
  const parts = [when];
  if (name) parts.push(name);
  if (status) parts.push(status);
  return parts.join(' · ');
}

/**
 * Lab reports — same UX as consulting history: one snapshot + date dropdown.
 */
export default function DoctorLabReportsSnapshot({ labs = [], onViewReport }) {
  const latestId = labs[0]?.id != null ? String(labs[0].id) : '';
  const [selectedId, setSelectedId] = useState(latestId);

  useEffect(() => {
    setSelectedId(latestId);
  }, [latestId, labs.length]);

  const activeId = useMemo(() => {
    if (!labs.length) return '';
    if (selectedId && labs.some((t) => String(t.id) === String(selectedId))) {
      return String(selectedId);
    }
    return String(labs[0].id);
  }, [labs, selectedId]);

  const snapshot = useMemo(
    () => labs.find((t) => String(t.id) === String(activeId)) || labs[0],
    [labs, activeId],
  );

  if (!snapshot) return null;

  const isLatest = String(snapshot.id) === String(labs[0]?.id);

  return (
    <div className="nurse-vitals-snapshot doc-lab-snapshot">
      <div className="nurse-vital-detail__info-bar nurse-card nurse-card--padded">
        <div className="nurse-vital-detail__info-item nurse-vital-detail__info-item--filter">
          <Calendar size={18} aria-hidden />
          <NurseHistoryFilter
            label="Ordered"
            items={labs}
            value={activeId}
            onChange={setSelectedId}
            getItemId={(item) => String(item.id)}
            getItemDate={(item) => item}
            formatDate={formatLabFilterDate}
          />
        </div>
        <div className="nurse-vital-detail__info-item doc-lab-snapshot__status-item">
          <Beaker size={18} aria-hidden />
          <div className="doc-lab-snapshot__status-block">
            <span className="nurse-vital-detail__info-label">Status</span>
            <span className="nurse-vital-detail__info-value doc-lab-snapshot__status">
              {isLatest ? <span className="doc-visit-latest">Latest</span> : null}
              {snapshot.doctorStatus || snapshot.status ? (
                <StatusPill status={snapshot.doctorStatus ?? snapshot.status} />
              ) : (
                '—'
              )}
            </span>
          </div>
          <div className="doc-lab-snapshot__report-block">
            <span className="nurse-vital-detail__info-label">Report</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="doc-lab-snapshot__view-btn"
              onClick={() => onViewReport?.(snapshot)}
            >
              <Eye size={14} aria-hidden />
              View report
            </Button>
          </div>
        </div>
      </div>

      <section className="nurse-vital-detail__section">
        <h2 className="nurse-vital-detail__section-title">
          <Beaker size={16} aria-hidden />
          Lab report
        </h2>
        <div className="doc-visit-detail-grid nurse-card nurse-card--padded">
          <div className="doc-visit-detail-tile">
            <span className="doc-visit-detail-tile__label">Test</span>
            <p className="doc-visit-detail-tile__value">{snapshot.testName || '—'}</p>
          </div>
          <div className="doc-visit-detail-tile">
            <span className="doc-visit-detail-tile__label">Category</span>
            <p className="doc-visit-detail-tile__value">
              {snapshot.departmentName || snapshot.category || '—'}
            </p>
          </div>
          <div className="doc-visit-detail-tile">
            <span className="doc-visit-detail-tile__label">Priority</span>
            <p className="doc-visit-detail-tile__value">{snapshot.priority || '—'}</p>
          </div>
          <div className="doc-visit-detail-tile">
            <span className="doc-visit-detail-tile__label">Ordered</span>
            <p className="doc-visit-detail-tile__value">{snapshot.orderedDisplay || '—'}</p>
          </div>
          <div className="doc-visit-detail-tile doc-visit-detail-tile--wide">
            <span className="doc-visit-detail-tile__label">Clinical notes</span>
            <p className="doc-visit-detail-tile__value">
              {String(snapshot.clinicalNotes ?? '').trim() || '—'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
