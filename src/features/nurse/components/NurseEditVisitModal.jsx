import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Select, Textarea } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import NurseConfirmDialog from '@/features/nurse/components/NurseConfirmDialog';
import {
  useNurseActiveDoctorsQuery,
  useUpdateDoctorVisitMutation,
  useVoidDoctorVisitMutation,
} from '@/shared/hooks/queries/useNurseQuery';

function toLocalDatetimeValue(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NurseEditVisitModal({ open, visit, onClose }) {
  const updateVisit = useUpdateDoctorVisitMutation(visit?.id);
  const voidVisit = useVoidDoctorVisitMutation(visit?.id);
  const { data: doctorsData, isLoading: doctorsLoading } = useNurseActiveDoctorsQuery(
    { page: 1, page_size: 100 },
    { enabled: open },
  );

  const [department, setDepartment] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [visitedAt, setVisitedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    if (!open || !visit) return;
    setDepartment('');
    setDoctorId(visit.doctor_id != null ? String(visit.doctor_id) : '');
    setVisitedAt(toLocalDatetimeValue(visit.visited_at));
    setNotes(visit.notes ?? '');
    setVoidOpen(false);
    setVoidReason('');
  }, [open, visit]);

  const departmentOptions = useMemo(() => {
    const depts = new Set();
    for (const doc of doctorsData?.doctors ?? []) {
      const d = String(doc.specialization || '').trim();
      if (d) depts.add(d);
    }
    return [...depts].sort((a, b) => a.localeCompare(b)).map((d) => ({
      value: d,
      label: d,
    }));
  }, [doctorsData]);

  const doctorOptions = useMemo(() => {
    const all = (doctorsData?.doctors ?? []).map((doc) => ({
      value: String(doc.id),
      label: doc.specialization ? `${doc.name} · ${doc.specialization}` : doc.name,
      department: String(doc.specialization || '').trim(),
    }));
    if (!department) return all;
    return all.filter((doc) => doc.department === department);
  }, [doctorsData, department]);

  const handleSubmit = async () => {
    if (!doctorId) {
      toast.error('Please select a doctor');
      return;
    }
    if (!visitedAt) {
      toast.error('Please set the visit time');
      return;
    }

    const payload = {
      doctor_id: Number(doctorId),
      visited_at: new Date(visitedAt).toISOString(),
      notes: notes.trim() || null,
    };

    try {
      await updateVisit.mutateAsync(payload);
      toast.success('Doctor visit updated');
      onClose();
    } catch {
      // mutationOnError toasts most failures
    }
  };

  const handleVoid = async () => {
    if (String(voidReason).trim().length < 3) {
      toast.error('Please provide a cancel reason (min 3 characters)');
      return;
    }
    try {
      await voidVisit.mutateAsync({ void_reason: voidReason.trim() });
      toast.success('Doctor visit cancelled');
      setVoidOpen(false);
      onClose();
    } catch {
      // mutationOnError toasts most failures
    }
  };

  return (
    <>
      <Modal
        isOpen={open}
        onClose={onClose}
        title={`Edit Doctor Visit${visit?.patient_name ? ` · ${visit.patient_name}` : ''}`}
        footer={
          <>
            {!visit?.is_voided && (
              <Button
                variant="danger"
                onClick={() => setVoidOpen(true)}
                disabled={updateVisit.isPending || voidVisit.isPending}
              >
                Cancel visit
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={updateVisit.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateVisit.isPending || visit?.is_voided}
            >
              {updateVisit.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div className="nurse-log-visit-form">
          {visit?.is_voided && (
            <div className="nurse-alert nurse-alert--error">
              This visit has been cancelled and can no longer be edited.
            </div>
          )}

          <div className="nurse-field">
            <label>Patient</label>
            <div className="nurse-input nurse-edit-visit__patient">
              {visit?.patient_name || '—'}
              {visit?.patient_uid ? ` (${visit.patient_uid})` : ''}
            </div>
          </div>

          <Select
            label="Department"
            value={department}
            onChange={setDepartment}
            placeholder={doctorsLoading ? 'Loading departments...' : 'Select department'}
            options={departmentOptions}
            disabled={updateVisit.isPending || visit?.is_voided}
          />

          <Select
            label="Doctor *"
            value={doctorId}
            onChange={setDoctorId}
            placeholder={doctorsLoading ? 'Loading doctors...' : 'Select doctor'}
            options={doctorOptions}
            disabled={updateVisit.isPending || visit?.is_voided}
          />

          <div className="nurse-field">
            <label htmlFor="nurse-edit-visit-datetime">Visited at *</label>
            <input
              id="nurse-edit-visit-datetime"
              type="datetime-local"
              className="nurse-input"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              disabled={updateVisit.isPending || visit?.is_voided}
            />
          </div>

          <Textarea
            label="Notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about the visit"
            disabled={updateVisit.isPending || visit?.is_voided}
          />

          {visit?.updated_by_name && (
            <p className="nurse-edit-visit__meta">
              Last edited by <strong>{visit.updated_by_name}</strong>
              {visit.updated_at ? ` on ${new Date(visit.updated_at).toLocaleString()}` : ''}
            </p>
          )}
        </div>
      </Modal>

      <NurseConfirmDialog
        open={voidOpen}
        title="Cancel doctor visit"
        subtitle="This action cannot be undone"
        description={
          <div className="nurse-void-form">
            <p>
              Cancelling this visit removes it from active records. Please provide a reason.
            </p>
            <textarea
              className="nurse-input nurse-void-form__reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Reason for cancelling (required)"
              rows={3}
              autoFocus
            />
          </div>
        }
        confirmLabel={voidVisit.isPending ? 'Cancelling...' : 'Cancel visit'}
        variant="danger"
        onConfirm={handleVoid}
        onCancel={() => setVoidOpen(false)}
      />
    </>
  );
}
