/** Map backend slot time (HH:MM) to UI label (h:mm AM/PM). */

export function formatSlotTime24To12(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return hhmm;
  const parts = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!parts) return hhmm;
  const hours = parseInt(parts[1], 10);
  const minutes = parts[2];
  const d = new Date();
  d.setHours(hours, parseInt(minutes, 10), 0, 0);
  if (Number.isNaN(d.getTime())) return hhmm;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function mapApiDoctorSlots(raw) {
  const rows = raw?.slots ?? [];
  return rows.map((slot) => {
    const time24 = slot.time ?? slot.start_time;
    const label = formatSlotTime24To12(time24);
    const status = String(slot.status ?? '').toLowerCase();
    return {
      time: label,
      time24,
      available: status === 'available',
    };
  });
}
