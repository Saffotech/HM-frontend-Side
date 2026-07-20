/**
 * Older saves stuffed "Symptoms:" / "Follow-up:" into prescription or notes text.
 * Split those back into dedicated fields for Visit History / consultation UI.
 */
export function parseEmbeddedClinicalNotes(rawNotes) {
  if (rawNotes == null) {
    return { symptoms: null, followUp: null, notes: null };
  }
  const text = String(rawNotes).trim();
  if (!text || text === '—') {
    return { symptoms: null, followUp: null, notes: null };
  }

  let symptoms = null;
  let followUp = null;
  const noteLines = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const fuOnly = trimmed.match(/^follow-?up\s*:\s*(.+)$/i);
    const fuInline = trimmed.match(/follow-?up\s*:\s*(\d{4}-\d{2}-\d{2}|\S+)/i);

    if (/^symptoms\s*:/i.test(trimmed)) {
      const symMatch = trimmed.match(
        /^symptoms\s*:\s*(.+?)(?:\s+follow-?up\s*:.*)?$/i,
      );
      const value = (symMatch?.[1] ?? '').trim();
      if (value) {
        symptoms = value.replace(/\s+follow-?up\s*:.*$/i, '').trim() || value;
      }
      if (fuInline && !followUp) followUp = fuInline[1].trim();
      continue;
    }
    if (fuOnly) {
      followUp = fuOnly[1].trim();
      continue;
    }
    noteLines.push(trimmed);
  }

  // Single-line blob: "Symptoms: body heat Follow-up: 2026-07-19"
  if (!symptoms || !followUp) {
    const inlineSym = text.match(/symptoms\s*:\s*(.+?)(?=\s+follow-?up\s*:|$)/i);
    const inlineFu = text.match(/follow-?up\s*:\s*(\d{4}-\d{2}-\d{2}|\S+)/i);
    if (!symptoms && inlineSym) symptoms = inlineSym[1].trim();
    if (!followUp && inlineFu) followUp = inlineFu[1].trim();
  }

  const cleanedNotes = noteLines
    .filter((line) => !/^symptoms\s*:/i.test(line) && !/^follow-?up\s*:/i.test(line))
    .join('\n')
    .trim();

  return {
    symptoms: symptoms || null,
    followUp: followUp || null,
    notes: cleanedNotes || null,
  };
}
