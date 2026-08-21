/** Resolve OPD appointment / IPD admission targets for POST /lab-tests from patient profile. */

function admissionIdFromRow(row) {
  const raw = row?.admissionId ?? row?.dbId;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isAdmittedIpdRow(row) {
  return String(row?.status ?? '').trim().toLowerCase() === 'admitted';
}

/**
 * @returns {Array<{ key: string, label: string, appointmentDbId: number|null, admissionId: number|null, sortTime: number }>}
 */
export function buildPatientLabOrderLinks(visits = [], ipdAdmissions = []) {
  const links = [];
  const seen = new Set();

  for (const row of ipdAdmissions) {
    if (!isAdmittedIpdRow(row)) continue;
    const admissionId = admissionIdFromRow(row);
    if (admissionId == null) continue;
    const key = `adm:${admissionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ward = row.wardName ? ` · ${row.wardName}` : '';
    const bed = row.bedNumber ? ` · Bed ${row.bedNumber}` : '';
    links.push({
      key,
      admissionId,
      appointmentDbId: null,
      label: `IPD · Admitted${ward}${bed}`,
      sortTime: row.admittedAt ? new Date(row.admittedAt).getTime() : Date.now(),
    });
  }

  for (const visit of visits) {
    if (visit.appointmentDbId != null) {
      const appointmentDbId = Number(visit.appointmentDbId);
      if (!Number.isFinite(appointmentDbId)) continue;
      const key = `appt:${appointmentDbId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({
        key,
        admissionId: null,
        appointmentDbId,
        label: `OPD · ${visit.dateTime ?? 'Visit'}${visit.status ? ` · ${visit.status}` : ''}`,
        sortTime: visit.sortTime ?? 0,
      });
      continue;
    }

    if (visit.admissionId == null) continue;
    const admissionId = Number(visit.admissionId);
    if (!Number.isFinite(admissionId)) continue;
    const key = `adm:${admissionId}`;
    if (seen.has(key)) continue;

    const ipdRow = ipdAdmissions.find(
      (row) => admissionIdFromRow(row) === admissionId,
    );
    if (ipdRow && !isAdmittedIpdRow(ipdRow)) continue;

    seen.add(key);
    links.push({
      key,
      admissionId,
      appointmentDbId: null,
      label: `IPD · ${visit.dateTime ?? 'Stay'}${visit.status ? ` · ${visit.status}` : ''}`,
      sortTime: visit.sortTime ?? 0,
    });
  }

  return links.sort((a, b) => (b.sortTime ?? 0) - (a.sortTime ?? 0));
}

export function findPatientLabOrderLink(links, key) {
  return links.find((link) => link.key === key) ?? null;
}
