import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Select, Textarea } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import NursePatientPicker from '@/features/nurse/components/NursePatientPicker';
import { useNurseActiveDoctorsQuery, useNurseDepartmentsQuery, useCreateDoctorVisitMutation } from '@/shared/hooks/queries/useNurseQuery';
import { filterClinicalDepartments } from '@/shared/utils/labDepartments';

function toLocalDatetimeValue(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {{ patient_id: number, patient_name?: string }|null} [props.initialPatient]
 *   When provided, the patient is pre-selected (e.g. from an IPD patient row) and shown read-only.
 */
export default function NurseLogVisitModal({ open, onClose, initialPatient = null }) {
  const createVisit = useCreateDoctorVisitMutation();
  const { data: doctorsData, isLoading: doctorsLoading } = useNurseActiveDoctorsQuery(
    { page: 1, page_size: 100 },
    { enabled: open },
  );
  const { data: departmentsData, isLoading: departmentsLoading } = useNurseDepartmentsQuery(
    { page: 1, page_size: 100 },
    { enabled: open },
  );

  const [patientId, setPatientId] = useState(null);
  const [department, setDepartment] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [visitedAt, setVisitedAt] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setPatientId(initialPatient?.patient_id ?? null);
    setDepartment('');
    setDoctorId('');
    setVisitedAt(toLocalDatetimeValue(new Date()));
    setNotes('');
  }, [open, initialPatient]);

  const departmentOptions = useMemo(
    () => filterClinicalDepartments(departmentsData?.departments ?? []).map((dept) => ({
      value: dept.name,
      label: dept.name,
    })),
    [departmentsData],
  );

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
    if (!patientId) {
      toast.error('Please select a patient');
      return;
    }
    if (!doctorId) {
      toast.error('Please select a doctor');
      return;
    }
    if (!visitedAt) {
      toast.error('Please set the visit time');
      return;
    }

    const payload = {
      patient_id: Number(patientId),
      doctor_id: Number(doctorId),
      visited_at: new Date(visitedAt).toISOString(),
      notes: notes.trim() || null,
    };

    try {
      await createVisit.mutateAsync(payload);
      toast.success('Doctor visit logged');
      onClose();
    } catch {
      // mutationOnError toasts most failures
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Log Doctor Visit"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={createVisit.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createVisit.isPending}>
            {createVisit.isPending ? 'Logging...' : 'Log visit'}
          </Button>
        </>
      }
    >
      <div className="nurse-log-visit-form">
        {initialPatient ? (
          <div className="nurse-field">
            <label>Patient</label>
            <div className="nurse-input nurse-edit-visit__patient">
              {initialPatient.patient_name || '—'}
            </div>
          </div>
        ) : (
          <NursePatientPicker
            value={patientId}
            onChange={setPatientId}
            required
            disabled={createVisit.isPending}
          />
        )}

        <Select
          label="Department"
          value={department}
          onChange={setDepartment}
          placeholder={departmentsLoading ? 'Loading departments...' : 'Select department'}
          options={departmentOptions}
          disabled={createVisit.isPending}
        />

        <Select
          label="Doctor *"
          value={doctorId}
          onChange={setDoctorId}
          placeholder={doctorsLoading ? 'Loading doctors...' : 'Select doctor'}
          options={doctorOptions}
          disabled={createVisit.isPending}
        />

        <div className="nurse-field">
          <label htmlFor="nurse-log-visit-datetime">Visited at *</label>
          <input
            id="nurse-log-visit-datetime"
            type="datetime-local"
            className="nurse-input"
            value={visitedAt}
            onChange={(e) => setVisitedAt(e.target.value)}
            disabled={createVisit.isPending}
          />
        </div>

        <Textarea
          label="Notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about the visit"
          disabled={createVisit.isPending}
        />
      </div>
    </Modal>
  );
}
