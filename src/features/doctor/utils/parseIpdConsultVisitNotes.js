/**
 * Parse IPD consult visit notes saved by ConsultationModal (buildIpdConsultVisitNotes).
 */

function parsePrescriptionLines(sectionText) {
  return sectionText
    .split('\n')
    .slice(1)
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => {
      const body = line.replace(/^-\s*/, '').trim();
      const parts = body.split('·').map((p) => p.trim()).filter(Boolean);
      return {
        name: parts[0] || body,
        dosage: parts[1] || '',
        frequency: parts[2] || '',
      };
    })
    .filter((med) => med.name);
}

/**
 * @returns {{ symptoms: string|null, diagnosis: string|null, notes: string|null, followUp: string|null, medicines: Array<{name:string,dosage?:string}> }}
 */
export function parseIpdConsultVisitNotes(rawNotes) {
  const text = String(rawNotes ?? '').trim();
  if (!text) {
    return { symptoms: null, diagnosis: null, notes: null, followUp: null, medicines: [] };
  }

  let symptoms = null;
  let diagnosis = null;
  let notes = null;
  let followUp = null;
  let medicines = [];

  const sections = text.split(/\n\n+/);
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (/^symptoms\s*:/i.test(trimmed)) {
      symptoms = trimmed.replace(/^symptoms\s*:\s*/i, '').trim() || null;
    } else if (/^diagnosis\s*:/i.test(trimmed)) {
      diagnosis = trimmed.replace(/^diagnosis\s*:\s*/i, '').trim() || null;
    } else if (/^notes\s*:/i.test(trimmed)) {
      notes = trimmed.replace(/^notes\s*:\s*/i, '').trim() || null;
    } else if (/^follow-up\s*:/i.test(trimmed)) {
      followUp = trimmed.replace(/^follow-up\s*:\s*/i, '').trim() || null;
    } else if (/^prescription\s*:/i.test(trimmed)) {
      medicines = parsePrescriptionLines(trimmed);
    }
  }

  return { symptoms, diagnosis, notes, followUp, medicines };
}
