/**
 * Care team on an IPD admission detail page.
 * If no doctor was set at admit, the first assign becomes Primary via PUT admission.
 * Extra doctors use care_team APIs.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import {
  useAddIpdCareTeamDoctorMutation,
  useIpdDepartmentsQuery,
  useIpdDoctorsByDepartmentQuery,
  useRemoveIpdCareTeamDoctorMutation,
  useUpdateIpdAdmissionMutation,
} from '@/features/ipd/hooks/useIpdQuery';

function memberKey(doctorId, doctorName) {
  if (doctorId != null && String(doctorId).trim() !== '') {
    return `id:${String(doctorId)}`;
  }
  return `name:${String(doctorName || '')
    .trim()
    .toLowerCase()}`;
}

function displayName(value) {
  const name = String(value || '').trim();
  if (!name || name === '—') return '';
  return name;
}

function hasPrimaryDoctor(admission) {
  const id = admission?.doctor_id;
  if (id != null && String(id).trim() !== '') return true;
  return Boolean(displayName(admission?.doctor_name));
}

function buildCareTeamMembers(admission, visits = [], careTeam = []) {
  const members = [];
  const seen = new Set();

  const primaryId = admission?.doctor_id != null ? String(admission.doctor_id) : '';
  const primaryName = displayName(admission?.doctor_name);
  if (primaryId || primaryName) {
    const key = memberKey(primaryId, primaryName);
    seen.add(key);
    members.push({
      key: `primary-${key}`,
      doctorId: primaryId || null,
      doctorName: primaryName || '—',
      departmentName: admission?.department_name || '—',
      role: 'Primary',
      source: 'admission',
      removable: false,
    });
  }

  for (const extra of careTeam) {
    const id = extra?.doctor_id != null ? String(extra.doctor_id) : '';
    const name = displayName(extra?.doctor_name);
    if (!id && !name) continue;
    const key = memberKey(id, name);
    if (seen.has(key)) continue;
    seen.add(key);
    members.push({
      key: `associated-${key}`,
      doctorId: id || null,
      doctorName: name || '—',
      departmentName: extra?.department_name || '—',
      role: 'Associated',
      source: 'care_team',
      removable: Boolean(id),
    });
  }

  for (const visit of visits) {
    const id = visit?.doctor_id != null ? String(visit.doctor_id) : '';
    const name = displayName(visit?.doctor_name);
    if (!id && !name) continue;
    const key = memberKey(id, name);
    if (seen.has(key)) continue;
    seen.add(key);
    members.push({
      key: `visit-${key}`,
      doctorId: id || null,
      doctorName: name || '—',
      departmentName: visit?.department_name || '—',
      role: 'Visited',
      source: 'visit',
      removable: false,
    });
  }

  return members;
}

function careTeamErrorMessage(err) {
  if (err?.status === 409) {
    return err.message || 'This doctor is already associated with this patient.';
  }
  if (err?.status === 400) {
    return err.message || 'This doctor cannot be added to the care team.';
  }
  return err?.message || 'Could not update care team. Please try again.';
}

export default function AdmissionCareTeamEditor({
  admission,
  visits = [],
  careTeam = [],
  canEdit = false,
  compact = false,
}) {
  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [error, setError] = useState('');

  const departmentsQuery = useIpdDepartmentsQuery();
  const doctorsQuery = useIpdDoctorsByDepartmentQuery(departmentId || null);
  const addMutation = useAddIpdCareTeamDoctorMutation();
  const removeMutation = useRemoveIpdCareTeamDoctorMutation();
  const assignPrimaryMutation = useUpdateIpdAdmissionMutation();
  const busy =
    addMutation.isPending ||
    removeMutation.isPending ||
    assignPrimaryMutation.isPending;

  useEffect(() => {
    setDepartmentId('');
    setDoctorId('');
    setError('');
  }, [admission?.id]);

  const members = useMemo(
    () => buildCareTeamMembers(admission, visits, careTeam),
    [admission, visits, careTeam],
  );
  const needsPrimary = !hasPrimaryDoctor(admission);

  if (!admission) return null;

  const canAdd = canEdit && admission.status === 'admitted';
  const selectedDoctor = (doctorsQuery.data ?? []).find(
    (doc) => String(doc.id) === String(doctorId),
  );

  const onAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!departmentId || !doctorId || !selectedDoctor) {
      setError(
        needsPrimary
          ? 'Select department and doctor to assign as primary.'
          : 'Select department and doctor to add.',
      );
      return;
    }

    const key = memberKey(doctorId, selectedDoctor.name);
    const already = members.some(
      (m) => memberKey(m.doctorId, m.doctorName) === key,
    );
    if (already) {
      setError('This doctor is already associated with this patient.');
      return;
    }

    try {
      if (needsPrimary) {
        await assignPrimaryMutation.mutateAsync({
          admissionId: admission.id,
          payload: {
            doctor_id: Number(doctorId),
            department_id: Number(departmentId),
          },
        });
        setDepartmentId('');
        setDoctorId('');
        toast.success('Primary doctor assigned');
        return;
      }

      await addMutation.mutateAsync({
        admissionId: admission.id,
        payload: {
          doctor_id: Number(doctorId),
          department_id: Number(departmentId),
        },
      });
      setDepartmentId('');
      setDoctorId('');
      toast.success('Doctor added to care team');
    } catch (err) {
      setError(careTeamErrorMessage(err));
    }
  };

  const onRemove = async (row) => {
    if (!row?.removable || !row.doctorId || busy) return;
    setError('');
    try {
      await removeMutation.mutateAsync({
        admissionId: admission.id,
        doctorId: Number(row.doctorId),
      });
      toast.success('Doctor removed from care team');
    } catch (err) {
      setError(careTeamErrorMessage(err));
    }
  };

  return (
    <div className={`ipd-care-team${compact ? ' ipd-care-team--compact' : ''}`}>
      <div className="ipd-care-team__meta">
        <span className="ipd-care-team__count">
          {members.length === 0
            ? needsPrimary
              ? 'No primary doctor assigned yet'
              : 'No doctors associated yet'
            : `${members.length} doctor${members.length === 1 ? '' : 's'} associated`}
        </span>
      </div>

      {members.length === 0 ? (
        <p className="ipd-pd-muted">
          {needsPrimary
            ? 'No doctor was assigned at admit. Assign a primary doctor below.'
            : 'The primary doctor stays as assigned at admit. Add more doctors below to show everyone associated with this patient.'}
        </p>
      ) : (
        <div className="ipd-table-wrap ipd-care-team__table-wrap">
          <table className="ipd-table ipd-table--dense ipd-care-team__table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Department</th>
                <th>Role</th>
                {canAdd ? <th className="ipd-care-team__col-actions"> </th> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((row) => (
                <tr key={row.key}>
                  <td>{row.doctorName}</td>
                  <td>{row.departmentName}</td>
                  <td>
                    <span
                      className={`ipd-care-team__role ipd-care-team__role--${
                        row.role === 'Primary'
                          ? 'primary'
                          : row.role === 'Associated'
                            ? 'associated'
                            : 'visit'
                      }`}
                    >
                      {row.role}
                    </span>
                  </td>
                  {canAdd ? (
                    <td className="ipd-care-team__col-actions">
                      {row.removable ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(row)}
                          disabled={busy}
                          aria-label={`Remove ${row.doctorName}`}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canAdd ? (
        <form className="ipd-care-team-form ipd-care-team-form--row" onSubmit={onAdd}>
          <div className="ipd-toolbar__field">
            <label className="ipd-toolbar__label" htmlFor="ipd-care-add-dept">
              {needsPrimary ? 'Assign primary — Department' : 'Add doctor — Department'}
            </label>
            <select
              id="ipd-care-add-dept"
              className="ipd-select"
              value={departmentId}
              disabled={busy}
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
            <label className="ipd-toolbar__label" htmlFor="ipd-care-add-doctor">
              Doctor
            </label>
            <select
              id="ipd-care-add-doctor"
              className="ipd-select"
              value={doctorId}
              onChange={(e) => {
                setDoctorId(e.target.value);
                setError('');
              }}
              disabled={!departmentId || doctorsQuery.isLoading || busy}
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
              disabled={!departmentId || !doctorId || busy}
            >
              {needsPrimary
                ? assignPrimaryMutation.isPending
                  ? 'Assigning…'
                  : 'Assign primary'
                : addMutation.isPending
                  ? 'Adding…'
                  : 'Add doctor'}
            </Button>
          </div>
          {error ? (
            <p className="ipd-field-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
