/** OPD/IPD visit + ward/bed display helpers for lab orders and reports. */

export function normalizeEncounterType(value) {
  const key = String(value ?? 'OPD').trim().toUpperCase();
  return key === 'IPD' ? 'IPD' : 'OPD';
}

export function visitLocationLabel(order) {
  const visit = normalizeEncounterType(order?.encounterType);
  if (visit !== 'IPD') {
    return { visit, ward: '-', bed: '-' };
  }
  return {
    visit: 'IPD',
    ward: order?.wardName?.trim() || '-',
    bed: order?.bedNumber?.trim() || '-',
  };
}

export function encounterBadgeClass(encounterType) {
  return normalizeEncounterType(encounterType) === 'IPD'
    ? 'lab-badge ipd'
    : 'lab-badge opd';
}

export function visitLocationSummary(order) {
  const { visit, ward, bed } = visitLocationLabel(order);
  if (visit === 'IPD') return `${ward} · ${bed}`;
  return null;
}

export function reportMatchesArchiveSearch(report, query) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return true;

  const location = visitLocationLabel(report);
  const tokens = [
    report?.reportId,
    report?.patientName,
    report?.patientId,
    report?.testName,
    report?.doctorName,
    report?.uploadedByName,
    location.visit,
    location.ward,
    location.bed,
    report?.wardName,
    report?.bedNumber,
  ];

  return tokens.some((value) => String(value ?? '').toLowerCase().includes(q));
}

export function mapApiVisitLocationFields(row) {
  if (!row) {
    return {
      encounterType: 'OPD',
      admissionId: null,
      wardName: null,
      bedNumber: null,
    };
  }
  return {
    encounterType: normalizeEncounterType(row.encounter_type ?? row.encounterType),
    admissionId: row.admission_id ?? row.admissionId ?? null,
    wardName: row.ward_name ?? row.wardName ?? null,
    bedNumber: row.bed_number ?? row.bedNumber ?? null,
  };
}
