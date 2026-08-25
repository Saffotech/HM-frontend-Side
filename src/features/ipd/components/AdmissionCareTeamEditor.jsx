/**
 * Care team on an IPD admission detail page.
 * Keeps the admission primary doctor as-is; staff can add more associated doctors.
 * Extra members are stored in localStorage until a backend care-team API exists.
 */

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import {
  useIpdDepartmentsQuery,
  useIpdDoctorsByDepartmentQuery,
} from '@/features/ipd/hooks/useIpdQuery';
import {
  loadExtraCareTeamDoctors,
  saveExtraCareTeamDoctors,
} from '@/features/ipd/utils/careTeamLocalStore';

function memberKey(doctorId, doctorName) {
  if (doctorId != null && String(doctorId).trim() !== '') {
    return `id:${String(doctorId)}`;
  }
  return `name:${String(doctorName || '')
    .trim()
    .toLowerCase()}`;
}

function buildCareTeamMembers(admission, visits = [], extras = []) {
  const members = [];
  const seen = new Set();

  const primaryId = admission?.doctor_id != null ? String(admission.doctor_id) : '';
  const primaryName = String(admission?.doctor_name || '').trim();
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

  for (const visit of visits) {
    const id = visit?.doctor_id != null ? String(visit.doctor_id) : '';
    const name = String(visit?.doctor_name || '').trim();
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

  for (const extra of extras) {
    const id = extra?.doctorId != null ? String(extra.doctorId) : '';
    const name = String(extra?.doctorName || '').trim();
    if (!id && !name) continue;
    const key = memberKey(id, name);
    if (seen.has(key)) continue;
    seen.add(key);
    members.push({
      key: `extra-${key}`,
      doctorId: id || null,
      doctorName: name || '—',
      departmentName: extra?.departmentName || '—',
      role: 'Associated',
      source: 'extra',
      removable: true,
    });
  }

  return members;
}

export default function AdmissionCareTeamEditor({
  admission,
  visits = [],
  canEdit = false,
  compact = false,
}) {
  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [error, setError] = useState('');
  const [extras, setExtras] = useState([]);

  const departmentsQuery = useIpdDepartmentsQuery();
  const doctorsQuery = useIpdDoctorsByDepartmentQuery(departmentId || null);

  useEffect(() => {
    if (!admission?.id) {
      setExtras([]);
      return;
    }
    setExtras(loadExtraCareTeamDoctors(admission.id));
    setDepartmentId('');
    setDoctorId('');
    setError('');
  }, [admission?.id]);

  const members = useMemo(
    () => buildCareTeamMembers(admission, visits, extras),
    [admission, visits, extras],
  );

  if (!admission) return null;

  const canAdd = canEdit && admission.status === 'admitted';
  const selectedDoctor = (doctorsQuery.data ?? []).find(
    (doc) => String(doc.id) === String(doctorId),
  );
  const selectedDepartment = (departmentsQuery.data ?? []).find(
    (dept) => String(dept.id) === String(departmentId),
  );

  const persistExtras = (next) => {
    setExtras(next);
    saveExtraCareTeamDoctors(admission.id, next);
  };

  const onAdd = (e) => {
    e.preventDefault();
    setError('');
    if (!departmentId || !doctorId || !selectedDoctor) {
      setError('Select department and doctor to add.');
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

    const next = [
      ...extras,
      {
        doctorId: String(doctorId),
        doctorName: selectedDoctor.name || '—',
        departmentId: String(departmentId),
        departmentName: selectedDepartment?.name || '—',
      },
    ];
    persistExtras(next);
    setDepartmentId('');
    setDoctorId('');
    toast.success('Doctor added to care team');
  };

  const onRemove = (row) => {
    if (!row?.removable) return;
    const key = memberKey(row.doctorId, row.doctorName);
    const next = extras.filter(
      (item) => memberKey(item.doctorId, item.doctorName) !== key,
    );
    persistExtras(next);
    toast.success('Doctor removed from care team');
  };

  return (
    <div className={`ipd-care-team${compact ? ' ipd-care-team--compact' : ''}`}>
      <div className="ipd-care-team__meta">
        <span className="ipd-care-team__count">
          {members.length === 0
            ? 'No doctors associated yet'
            : `${members.length} doctor${members.length === 1 ? '' : 's'} associated`}
        </span>
      </div>

      {members.length === 0 ? (
        <p className="ipd-pd-muted">
          The primary doctor stays as assigned at admit. Add more doctors below to
          show everyone associated with this patient.
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
              Add doctor — Department
            </label>
            <select
              id="ipd-care-add-dept"
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
            <Button type="submit" size="sm" disabled={!departmentId || !doctorId}>
              Add doctor
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
