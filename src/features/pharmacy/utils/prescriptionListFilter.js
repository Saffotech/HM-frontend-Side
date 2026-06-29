/**
 * Client-side prescription list filtering (backend search is patient_name only).
 */

export function filterPrescriptionList(rows, search) {
  const term = String(search ?? '').trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((rx) => {
    const patientName = (rx.patient_name ?? '').toLowerCase();
    const doctorName = (rx.doctor_name ?? '').toLowerCase();
    const diagnosis = (rx.diagnosis ?? '').toLowerCase();
    const patientId = String(rx.patient_id ?? '');

    return (
      patientName.includes(term) ||
      patientId.includes(term) ||
      doctorName.includes(term) ||
      diagnosis.includes(term)
    );
  });
}
