import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ClipboardList,
  FileText,
  Stethoscope,
  User,
} from 'lucide-react';
import NurseHistoryFilter from '@/features/nurse/components/NurseHistoryFilter';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';

const NOTE_SECTIONS = [
  { key: 'symptoms', label: 'Symptoms', icon: Stethoscope, accent: 'rose' },
  { key: 'treatment_response', label: 'Treatment Response', icon: ClipboardList, accent: 'blue' },
  { key: 'additional_notes', label: 'Additional Notes', icon: FileText, accent: 'purple' },
];

function formatCreatedAt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function normalizeHistory(note) {
  if (!note) return [];
  if (note.history?.length) {
    return [...note.history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return [{
    history_id: `${note.id}-current`,
    created_at: note.created_at,
    created_by: note.created_by || note.nurse_name || note.created_by_name || null,
    status: note.status,
    symptoms: note.symptoms,
    treatment_response: note.treatment_response,
    additional_notes: note.additional_notes,
  }];
}

export default function NurseNotesSnapshotView({ note }) {
  const historyItems = useMemo(() => normalizeHistory(note), [note]);
  const latestHistoryId = historyItems[0]?.history_id ?? '';
  const [selectedHistoryId, setSelectedHistoryId] = useState(latestHistoryId);

  useEffect(() => {
    // Prefer newest note whenever the note / history set changes
    setSelectedHistoryId(latestHistoryId);
  }, [note?.id, latestHistoryId]);

  const activeHistoryId = useMemo(() => {
    if (!historyItems.length) return '';
    if (selectedHistoryId && historyItems.some((e) => e.history_id === selectedHistoryId)) {
      return selectedHistoryId;
    }
    return historyItems[0].history_id;
  }, [historyItems, selectedHistoryId]);

  const snapshot = useMemo(
    () => historyItems.find((entry) => entry.history_id === activeHistoryId) || historyItems[0],
    [historyItems, activeHistoryId]
  );

  if (!note || !snapshot) return null;

  return (
    <div className="nurse-notes-snapshot">
      <div className="nurse-vital-detail__info-bar nurse-card nurse-card--padded">
        <div className="nurse-vital-detail__info-item nurse-vital-detail__info-item--filter">
          <Calendar size={18} aria-hidden />
          <NurseHistoryFilter
            label="Created At"
            items={historyItems}
            value={activeHistoryId}
            onChange={setSelectedHistoryId}
            getItemId={(item) => item.history_id}
            getItemDate={(item) => item.created_at}
            formatDate={formatCreatedAt}
          />
        </div>
        <div className="nurse-vital-detail__info-item">
          <User size={18} aria-hidden />
          <div>
            <span className="nurse-vital-detail__info-label">Recorded By</span>
            <span className="nurse-vital-detail__info-value">
              {snapshot.created_by || snapshot.nurse_name || snapshot.created_by_name || '—'}
            </span>
          </div>
        </div>
        <div className="nurse-vital-detail__info-item">
          <Stethoscope size={18} aria-hidden />
          <div>
            <span className="nurse-vital-detail__info-label">Status</span>
            <NurseQueueStatusBadge status={snapshot.status} />
          </div>
        </div>
      </div>

      <section className="nurse-vital-detail__section">
        <h2 className="nurse-vital-detail__section-title">Nursing Note</h2>
        <div className="nurse-note-detail__sections">
          {NOTE_SECTIONS.map(({ key, label, icon: Icon, accent }) => (
            <div key={key} className={`nurse-note-detail__card nurse-note-detail__card--${accent}`}>
              <div className="nurse-note-detail__card-header">
                <div className={`nurse-note-detail__card-icon nurse-note-detail__card-icon--${accent}`}>
                  <Icon size={18} />
                </div>
                <h3>{label}</h3>
              </div>
              <p>{snapshot[key] || 'None recorded.'}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
