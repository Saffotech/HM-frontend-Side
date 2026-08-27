import { useEffect, useMemo, useState } from 'react';
import { Calendar, FileText, Stethoscope } from 'lucide-react';
import NurseHistoryFilter from '@/features/nurse/components/NurseHistoryFilter';
import StatusPill from '@/features/doctor/components/StatusPill';
import '../styles/doctor-patient-clinical.css';

function formatVisitFilterDate(visit) {
  if (!visit) return '—';
  if (visit.dateTime) return visit.dateTime;
  const raw = visit.scheduledAt ?? visit.sortTime;
  if (raw == null || raw === '') return '—';
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  return String(raw);
}

/**
 * Consulting history — same UX as vitals: one snapshot + date dropdown.
 */
export default function DoctorConsultHistorySnapshot({ visits = [] }) {
  const latestId = visits[0]?.id != null ? String(visits[0].id) : '';
  const [selectedId, setSelectedId] = useState(latestId);

  useEffect(() => {
    setSelectedId(latestId);
  }, [latestId, visits.length]);

  const activeId = useMemo(() => {
    if (!visits.length) return '';
    if (selectedId && visits.some((v) => String(v.id) === String(selectedId))) {
      return String(selectedId);
    }
    return String(visits[0].id);
  }, [visits, selectedId]);

  const snapshot = useMemo(
    () => visits.find((v) => String(v.id) === String(activeId)) || visits[0],
    [visits, activeId],
  );

  if (!snapshot) return null;

  const isLatest = String(snapshot.id) === String(visits[0]?.id);

  return (
    <div className="nurse-vitals-snapshot doc-consult-snapshot">
      <div className="nurse-vital-detail__info-bar nurse-card nurse-card--padded">
        <div className="nurse-vital-detail__info-item nurse-vital-detail__info-item--filter">
          <Calendar size={18} aria-hidden />
          <NurseHistoryFilter
            label="Visit date"
            items={visits}
            value={activeId}
            onChange={setSelectedId}
            getItemId={(item) => String(item.id)}
            getItemDate={(item) => item}
            formatDate={formatVisitFilterDate}
          />
        </div>
        <div className="nurse-vital-detail__info-item">
          <Stethoscope size={18} aria-hidden />
          <div>
            <span className="nurse-vital-detail__info-label">Status</span>
            <span className="nurse-vital-detail__info-value doc-consult-snapshot__status">
              {isLatest ? <span className="doc-visit-latest">Latest</span> : null}
              {snapshot.status ? <StatusPill status={snapshot.status} /> : '—'}
            </span>
          </div>
        </div>
      </div>

      <section className="nurse-vital-detail__section">
        <h2 className="nurse-vital-detail__section-title">
          <FileText size={16} aria-hidden />
          Consultation
        </h2>
        <div className="doc-visit-detail-grid nurse-card nurse-card--padded">
          <div className="doc-visit-detail-tile">
            <span className="doc-visit-detail-tile__label">Symptoms</span>
            <p className="doc-visit-detail-tile__value">{snapshot.symptoms || '—'}</p>
          </div>
          <div className="doc-visit-detail-tile">
            <span className="doc-visit-detail-tile__label">Diagnosis</span>
            <p className="doc-visit-detail-tile__value">{snapshot.diagnosis || '—'}</p>
          </div>
          <div className="doc-visit-detail-tile">
            <span className="doc-visit-detail-tile__label">Notes</span>
            <p className="doc-visit-detail-tile__value">{snapshot.notes || '—'}</p>
          </div>
          <div className="doc-visit-detail-tile">
            <span className="doc-visit-detail-tile__label">Follow-up</span>
            <p className="doc-visit-detail-tile__value">{snapshot.followUp || '—'}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
