/** Normalize doctor / diagnosis fields (single or multiple) for pharmacy UI. */

export function getPrescriptionDoctors(rx) {
  if (Array.isArray(rx?.doctors) && rx.doctors.length > 0) {
    return rx.doctors.map((d, i) => ({
      id: d.id ?? i,
      name: d.name ?? d.first_name ?? 'Unknown',
      department: d.department ?? null,
    }));
  }
  const single = rx?.doctor?.first_name ?? rx?.doctor_name;
  return single ? [{ id: 'primary', name: single, department: rx?.doctor?.department ?? null }] : [];
}

export function getPrescriptionDiagnoses(rx) {
  if (Array.isArray(rx?.diagnoses) && rx.diagnoses.length > 0) {
    return rx.diagnoses.map((d, i) => ({
      id: d.id ?? i,
      label: d.label ?? d.name ?? 'Unknown',
      noted_at: d.noted_at ?? null,
    }));
  }
  const single = rx?.diagnosis;
  return single ? [{ id: 'primary', label: single, noted_at: null }] : [];
}

export function formatDoctorListSummary(rx) {
  const doctors = getPrescriptionDoctors(rx);
  if (doctors.length === 0) return '—';
  if (doctors.length === 1) return doctors[0].name;
  return `${doctors[0].name} +${doctors.length - 1} more`;
}

export function formatDiagnosisListSummary(rx) {
  const diagnoses = getPrescriptionDiagnoses(rx);
  if (diagnoses.length === 0) return '—';
  if (diagnoses.length === 1) return diagnoses[0].label;
  return `${diagnoses[0].label} +${diagnoses.length - 1} more`;
}
