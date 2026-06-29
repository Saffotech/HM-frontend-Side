import { useMemo } from 'react';
import { useDoctorPatientVisitsQuery } from '@/features/doctor/hooks/useDoctorPatientQuery';
import { useDoctorPrescriptionsQuery } from '@/features/doctor/hooks/useDoctorPrescriptionQuery';
import PatientHistoryProfile from './PatientHistoryProfile';
import { resolveDoctorPatient } from '@/features/doctor/utils/patientHistory';
import { useState } from 'react';
import '../styles/doctor-ui.css';

function formatPrescriptionDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return dateStr;
}

function visitByPatientDbId(patientVisits) {
  const map = new Map();
  for (const visit of patientVisits) {
    if (visit.patientId == null) continue;
    const id = Number(visit.patientId);
    if (!map.has(id)) map.set(id, visit);
  }
  return map;
}

function flattenPrescriptionRows(prescriptions, patientVisits = []) {
  const byDbId = visitByPatientDbId(patientVisits);
  const rows = [];
  prescriptions.forEach((rx) => {
    const visit = rx.patientId != null ? byDbId.get(Number(rx.patientId)) : null;
    const patientUid = rx.patientUid ?? visit?.patientUid ?? null;
    const patientDbId = rx.patientId ?? visit?.patientId ?? null;
    const patientName = rx.patientName || visit?.name || null;
    const meds = rx.medicines?.length ? rx.medicines : [{ name: '—', dosage: '', frequency: '', duration: '' }];
    meds.forEach((med, medIndex) => {
      rows.push({
        rowKey: `${rx.id}-${medIndex}`,
        patientUid,
        patientDbId,
        patientName,
        diagnosis: rx.diagnosis,
        dateDisplay: formatPrescriptionDate(rx.date),
        medicineName: med.name || '—',
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
      });
    });
  });
  return rows.sort((a, b) => String(b.dateDisplay).localeCompare(String(a.dateDisplay)));
}

function PrescriptionsList({ rows, onSelectRow }) {
  return (
    <>
      <div className="doc-card doc-card__body--flush table-wrap">
        <table className="data-table doc-rx-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              <th>Diagnosis</th>
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                  No prescriptions yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.rowKey}
                  className="doc-rx-row"
                  onClick={() => onSelectRow(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRow(row);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open patient profile for ${row.patientName || row.patientUid || 'patient'}`}
                >
                  <td>{row.dateDisplay}</td>
                  <td>
                    <strong>{row.patientName || '—'}</strong>
                    {(row.patientUid || row.patientDbId) && (
                      <span className="doc-rx-patient-id">
                        {row.patientUid ?? row.patientDbId}
                      </span>
                    )}
                  </td>
                  <td>{row.diagnosis || '—'}</td>
                  <td>
                    <strong>{row.medicineName}</strong>
                  </td>
                  <td>{row.dosage || '—'}</td>
                  <td>{row.frequency}</td>
                  <td>{row.duration}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function PrescriptionsSection() {
  const { data: patientVisitsData } = useDoctorPatientVisitsQuery();
  const patientVisits = patientVisitsData?.visits ?? [];
  const patientDbIds = useMemo(
    () => [...new Set(patientVisits.map((v) => v.patientId).filter((id) => id != null))],
    [patientVisits]
  );
  const { data: prescriptions = [] } = useDoctorPrescriptionsQuery(patientDbIds);
  const [profilePatient, setProfilePatient] = useState(null);

  const rows = useMemo(
    () => flattenPrescriptionRows(prescriptions, patientVisits),
    [prescriptions, patientVisits]
  );

  if (profilePatient) {
    return (
      <PatientHistoryProfile
        patient={profilePatient}
        onBack={() => setProfilePatient(null)}
        backLabel="Back to Prescriptions"
      />
    );
  }

  return (
    <div className="doc-page">
      <PrescriptionsList
        rows={rows}
        onSelectRow={(row) =>
          setProfilePatient(
            resolveDoctorPatient(
              patientVisits,
              row.patientUid ?? row.patientDbId,
              row.patientName
            )
          )
        }
      />
    </div>
  );
}
