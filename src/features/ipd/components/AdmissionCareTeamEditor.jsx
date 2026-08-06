/**
 * Assign or update department / doctor on an active IPD admission.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import {
  useIpdDepartmentsQuery,
  useIpdDoctorsByDepartmentQuery,
  useUpdateIpdAdmissionMutation,
} from '@/features/ipd/hooks/useIpdQuery';

export default function AdmissionCareTeamEditor({
  admission,
  canEdit = false,
  compact = false,
}) {
  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [error, setError] = useState('');

  const departmentsQuery = useIpdDepartmentsQuery();
  const doctorsQuery = useIpdDoctorsByDepartmentQuery(departmentId || null);
  const updateMutation = useUpdateIpdAdmissionMutation();

  useEffect(() => {
    if (!admission) return;
    setDepartmentId(admission.department_id ? String(admission.department_id) : '');
    setDoctorId(admission.doctor_id ? String(admission.doctor_id) : '');
    setError('');
  }, [admission]);

  if (!admission) return null;

  const readOnly = !canEdit || admission.status !== 'admitted';

  if (readOnly) {
    return (
      <dl className={compact ? 'ipd-pd-grid ipd-pd-grid--care' : 'ipd-kv'}>
        {compact ? (
          <>
            <div className="ipd-pd-field">
              <dt>Department</dt>
              <dd>{admission.department_name || '—'}</dd>
            </div>
            <div className="ipd-pd-field">
              <dt>Doctor</dt>
              <dd>{admission.doctor_name || '—'}</dd>
            </div>
          </>
        ) : (
          <>
            <span className="ipd-kv__label">Doctor</span>
            <span className="ipd-kv__value">{admission.doctor_name || '—'}</span>
            <span className="ipd-kv__label">Department</span>
            <span className="ipd-kv__value">{admission.department_name || '—'}</span>
          </>
        )}
      </dl>
    );
  }

  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateMutation.mutateAsync({
        admissionId: admission.id,
        payload: {
          department_id: departmentId ? Number(departmentId) : null,
          doctor_id: doctorId ? Number(doctorId) : null,
        },
      });
      toast.success('Care team updated');
    } catch (err) {
      setError(err?.message || 'Could not update care team');
    }
  };

  const dirty =
    String(departmentId || '') !== String(admission.department_id || '') ||
    String(doctorId || '') !== String(admission.doctor_id || '');

  return (
    <form className="ipd-care-team-form ipd-care-team-form--row" onSubmit={onSave}>
      <div className="ipd-toolbar__field">
        <label className="ipd-toolbar__label" htmlFor="ipd-care-dept">
          Department
        </label>
        <select
          id="ipd-care-dept"
          className="ipd-select"
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setDoctorId('');
            setError('');
          }}
        >
          <option value="">
            {departmentsQuery.isLoading ? 'Loading…' : 'Select department…'}
          </option>
          {(departmentsQuery.data ?? []).map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>
      <div className="ipd-toolbar__field">
        <label className="ipd-toolbar__label" htmlFor="ipd-care-doctor">
          Doctor
        </label>
        <select
          id="ipd-care-doctor"
          className="ipd-select"
          value={doctorId}
          onChange={(e) => {
            setDoctorId(e.target.value);
            setError('');
          }}
          disabled={!departmentId || doctorsQuery.isLoading}
        >
          <option value="">
            {!departmentId
              ? 'Select department first…'
              : doctorsQuery.isLoading
                ? 'Loading doctors…'
                : (doctorsQuery.data ?? []).length === 0
                  ? 'No doctors in this department'
                  : 'Select doctor…'}
          </option>
          {(doctorsQuery.data ?? []).map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.name}
            </option>
          ))}
        </select>
      </div>
      <div className="ipd-care-team-form__save">
        <Button
          type="submit"
          size="sm"
          disabled={updateMutation.isPending || !dirty}
        >
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
      {error ? (
        <p className="ipd-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
