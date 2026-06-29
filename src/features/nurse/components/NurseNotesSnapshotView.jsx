import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  ClipboardList,
  FileText,
  Stethoscope,
  User,
} from 'lucide-react';
import NurseHistoryFilter from '@/features/nurse/components/NurseHistoryFilter';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';

export const NOTE_SECTIONS = [
  { key: 'symptoms', label: 'Symptoms', icon: Stethoscope, accent: 'rose' },
  { key: 'treatment_response', label: 'Treatment Response', icon: ClipboardList, accent: 'blue' },
  { key: 'additional_notes', label: 'Additional Notes', icon: FileText, accent: 'purple' },
];

export function formatCreatedAt(iso) {
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
    created_by: note.created_by,
    status: note.status,
    symptoms: note.symptoms,
    treatment_response: note.treatment_response,
    additional_notes: note.additional_notes,
  }];
}

export default function NurseNotesSnapshotView({ note }) {
  const historyItems = useMemo(() => normalizeHistory(note), [note]);
  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const historyLenRef = useRef(0);

  useEffect(() => {
    historyLenRef.current = 0;
    if (historyItems.length) {
      setSelectedHistoryId(historyItems[0].history_id);
    }
  }, [note?.id]);

  useEffect(() => {
    if (!historyItems.length) return;
    const len = historyItems.length;
    if (len > historyLenRef.current && historyLenRef.current > 0) {
      setSelectedHistoryId(historyItems[0].history_id);
    } else {
      setSelectedHistoryId((prev) => {
        const stillExists = historyItems.some((entry) => entry.history_id === prev);
        return stillExists ? prev : historyItems[0].history_id;
      });
    }
    historyLenRef.current = len;
  }, [historyItems, note?.id]);

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
            <span className="nurse-vital-detail__info-value">{snapshot.created_by || '—'}</span>
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
