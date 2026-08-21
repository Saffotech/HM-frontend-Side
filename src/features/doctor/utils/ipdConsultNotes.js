/**
 * Build IPD consult visit notes blob (symptoms, Rx, labs) for local visit-history cache.
 */

export function buildIpdConsultVisitNotes({
  symptoms = '',
  diagnosis = '',
  notes = '',
  followUp = '',
  meds = [],
  labOrders = [],
}) {
  const parts = [];
  if (symptoms.trim()) parts.push(`Symptoms: ${symptoms.trim()}`);
  if (diagnosis.trim()) parts.push(`Diagnosis: ${diagnosis.trim()}`);
  if (notes.trim()) parts.push(`Notes: ${notes.trim()}`);
  if (followUp) parts.push(`Follow-up: ${followUp}`);

  const validMeds = meds.filter((m) => m.name?.trim());
  if (validMeds.length) {
    parts.push(
      `Prescription:\n${validMeds
        .map((m) => {
          const duration = [m.durationValue, m.durationUnit].filter(Boolean).join(' ');
          return `- ${m.name}${m.dosage ? ` · ${m.dosage}` : ''}${m.frequency ? ` · ${m.frequency}` : ''}${duration ? ` · ${duration}` : ''}${m.instructions ? ` · ${m.instructions}` : ''}`;
        })
        .join('\n')}`,
    );
  }

  const filledLabOrders = labOrders.filter(
    (row) => String(row.testName ?? '').trim() && row.deptCode,
  );
  if (filledLabOrders.length) {
    parts.push(
      `Lab orders:\n${filledLabOrders
        .map((row) => `- ${row.deptCode}: ${row.testName}${row.priority ? ` (${row.priority})` : ''}`)
        .join('\n')}`,
    );
  }

  return parts.join('\n\n');
}
