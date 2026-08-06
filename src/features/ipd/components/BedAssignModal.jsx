/**
 * Assign bed modal — admits patient onto an available bed (POST /ipd/admissions).
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from '@/shared/components/common';
import { ROUTES, WARDS } from '@/shared/constants';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { usePatientsQuery } from '@/shared/hooks/queries/usePatientQuery';
import { asPatientList } from '@/shared/hooks/queries/listDataUtils';
import { toast } from '@/shared/utils/toast';
import {
  useCreateIpdAdmissionMutation,
  useIpdBedsQuery,
} from '@/features/ipd/hooks/useIpdQuery';
import { toIsoAdmissionDate } from '@/features/ipd/utils/ipdFormat';

const INITIAL = {
  patientSearch: '',
  patientDbId: '',
  ward: '',
  bedId: '',
  admissionDate: new Date().toISOString().slice(0, 10),
};

export default function BedAssignModal({ open, onClose }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL);
  const [error, setError] = useState('');
  const admitMutation = useCreateIpdAdmissionMutation();

  const debouncedSearch = useDebouncedValue(values.patientSearch, 300);
  const patientsQuery = usePatientsQuery({
    fetchAll: false,
    search: debouncedSearch,
    page: 1,
    limit: 8,
    enabled: open && debouncedSearch.trim().length >= 2,
  });
  const patientOptions = asPatientList(patientsQuery.data);

  const bedsQuery = useIpdBedsQuery({
    ward: values.ward || undefined,
    status: 'available',
  });
  const availableBeds = (bedsQuery.data?.beds ?? []).filter(
    (bed) => bed.status === 'available'
  );
  const wardOptions = useMemo(() => WARDS ?? [], []);

  const reset = () => {
    setValues(INITIAL);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const set = (key, value) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'ward') next.bedId = '';
      if (key === 'patientSearch') next.patientDbId = '';
      return next;
    });
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!values.patientDbId) {
      setError('Select a patient');
      return;
    }
    if (!values.bedId) {
      setError('Select an available bed');
      return;
    }

    try {
      const created = await admitMutation.mutateAsync({
        patient_id: Number(values.patientDbId),
        bed_id: Number(values.bedId),
        admission_date: toIsoAdmissionDate(values.admissionDate),
      });
      toast.success('Bed assigned and patient admitted');
      handleClose();
      navigate(
        ROUTES.IPD_PATIENT_DETAIL.replace(':admissionId', String(created.id))
      );
    } catch (err) {
      setError(err?.message || 'Could not assign bed');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Assign Bed"
      footer={
        <div className="ipd-form-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="ipd-assign-form"
            disabled={admitMutation.isPending}
          >
            {admitMutation.isPending ? 'Assigning…' : 'Confirm Assignment'}
          </Button>
        </div>
      }
    >
      <form id="ipd-assign-form" className="ipd-modal-form" onSubmit={onSubmit}>
        <p className="ipd-page__subtitle">
          Select a registered patient and an available bed to create an IPD admission.
        </p>
        <div className="ipd-toolbar__field">
          <label className="ipd-toolbar__label" htmlFor="ipd-assign-patient">
            Patient
          </label>
          <input
            id="ipd-assign-patient"
            className="ipd-input"
            placeholder="Search patient…"
            value={values.patientSearch}
            onChange={(e) => set('patientSearch', e.target.value)}
          />
          {patientOptions.length > 0 ? (
            <select
              className="ipd-select"
              style={{ marginTop: '0.5rem' }}
              value={values.patientDbId}
              onChange={(e) => {
                const id = e.target.value;
                const match = patientOptions.find((p) => String(p.dbId) === id);
                setValues((prev) => ({
                  ...prev,
                  patientDbId: id,
                  patientSearch: match?.name || prev.patientSearch,
                }));
              }}
            >
              <option value="">Select from results…</option>
              {patientOptions.map((p) => (
                <option key={p.dbId} value={p.dbId}>
                  {p.name} {p.id ? `(${p.id})` : ''}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="ipd-toolbar__field">
          <label className="ipd-toolbar__label" htmlFor="ipd-assign-ward">
            Ward
          </label>
          <select
            id="ipd-assign-ward"
            className="ipd-select"
            value={values.ward}
            onChange={(e) => set('ward', e.target.value)}
          >
            <option value="">Select ward…</option>
            {wardOptions.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <div className="ipd-toolbar__field">
          <label className="ipd-toolbar__label" htmlFor="ipd-assign-bed">
            Bed
          </label>
          <select
            id="ipd-assign-bed"
            className="ipd-select"
            value={values.bedId}
            onChange={(e) => set('bedId', e.target.value)}
            disabled={!values.ward}
          >
            <option value="">
              {!values.ward ? 'Select ward first…' : 'Select bed…'}
            </option>
            {availableBeds.map((bed) => (
              <option key={bed.id} value={bed.id}>
                {bed.bed_number}
              </option>
            ))}
          </select>
        </div>
        <div className="ipd-toolbar__field">
          <label className="ipd-toolbar__label" htmlFor="ipd-assign-date">
            Admission date
          </label>
          <input
            id="ipd-assign-date"
            type="date"
            className="ipd-input"
            value={values.admissionDate}
            onChange={(e) => set('admissionDate', e.target.value)}
          />
        </div>
        {error ? (
          <p className="ipd-field-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
