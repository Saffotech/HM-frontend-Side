/** Match a doctor lab order row to the active patient profile context. */
export function matchesLabTestPatient(test, { patientUid, patientId, name } = {}) {
  if (!test) return false;

  const profileKeys = new Set();
  if (patientUid != null && patientUid !== '') profileKeys.add(String(patientUid));
  if (patientId != null && patientId !== '') profileKeys.add(String(patientId));

  const testKeys = [
    test.patientUid,
    test.patientId,
    test.patientDbId,
  ]
    .filter((value) => value != null && value !== '')
    .map(String);

  for (const key of testKeys) {
    if (profileKeys.has(key)) return true;
  }

  if (name && test.patientName) {
    return String(test.patientName).trim().toLowerCase() === String(name).trim().toLowerCase();
  }

  return false;
}
