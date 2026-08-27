import { useState, useEffect, useMemo } from 'react';
import { Calendar, Pencil, Stethoscope, User } from 'lucide-react';
import NurseHistoryFilter from '@/features/nurse/components/NurseHistoryFilter';
import NursePermissionButton from '@/features/nurse/components/NursePermissionButton';
import NurseQueueStatusBadge from '@/features/nurse/components/NurseQueueStatusBadge';
import {
  NurseClinicalFieldShell,
  NurseClinicalReadonlyValue,
} from '@/features/nurse/components/NurseClinicalFieldCard';
import { NOTE_FIELDS } from '@/features/nurse/components/NurseNoteFormFields';

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

export default function NurseNotesSnapshotView({ note, action = null }) {
  const historyItems = useMemo(() => normalizeHistory(note), [note]);
  const latestHistoryId = historyItems[0]?.history_id ?? '';
  const [selectedHistoryId, setSelectedHistoryId] = useState(latestHistoryId);

  useEffect(() => {
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
    [historyItems, activeHistoryId],
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
        {action ? (
          <div className="nurse-vital-detail__info-item">
            <Pencil size={18} aria-hidden />
            <div>
              <span className="nurse-vital-detail__info-label">Action</span>
              <NursePermissionButton
                allowed={!action.disabled}
                className="nurse-btn nurse-btn--secondary nurse-vital-detail__action-btn"
                onClick={action.onClick}
              >
                {action.label || 'Update'}
              </NursePermissionButton>
            </div>
          </div>
        ) : (
          <div className="nurse-vital-detail__info-item">
            <Stethoscope size={18} aria-hidden />
            <div>
              <span className="nurse-vital-detail__info-label">Status</span>
              <NurseQueueStatusBadge status={snapshot.status} />
            </div>
          </div>
        )}
      </div>

      <section className="nurse-vital-detail__section">
        <h2 className="nurse-vital-detail__section-title">Nursing Note</h2>
        <div className="nurse-clinical-panel nurse-card nurse-card--padded">
          <div className="nurse-clinical-fields nurse-clinical-fields--grid nurse-clinical-fields--notes">
            {NOTE_FIELDS.map(({ key, label, icon: Icon, accent }) => (
              <NurseClinicalFieldShell
                key={key}
                accent={accent}
                icon={Icon}
                label={label}
              >
                <NurseClinicalReadonlyValue multiline rows={5}>
                  {snapshot[key]}
                </NurseClinicalReadonlyValue>
              </NurseClinicalFieldShell>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
