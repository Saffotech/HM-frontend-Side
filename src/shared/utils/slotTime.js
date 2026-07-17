/** Map backend slot time (HH:MM) to UI label (h:mm AM/PM). */

const UNAVAILABLE_STATUSES = new Set([
  'booked',
  'occupied',
  'taken',
  'unavailable',
  'busy',
]);

/** Deterministic 12h label — avoids locale NBSP quirks from toLocaleTimeString. */
export function formatSlotTime24To12(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return hhmm;
  const parts = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!parts) return hhmm;
  let hours = parseInt(parts[1], 10);
  const minutes = parts[2];
  if (Number.isNaN(hours)) return hhmm;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${meridiem}`;
}

function unwrapSlotsPayload(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.slots)) return raw.slots;
  if (Array.isArray(raw.data?.slots)) return raw.data.slots;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}

function isSlotAvailable(slot) {
  if (slot == null) return false;
  if (typeof slot.available === 'boolean') return slot.available;
  if (typeof slot.is_available === 'boolean') return slot.is_available;
  const status = String(slot.status ?? '').toLowerCase().trim();
  if (!status) return true;
  if (UNAVAILABLE_STATUSES.has(status)) return false;
  return status === 'available';
}

export function mapApiDoctorSlots(raw) {
  const rows = unwrapSlotsPayload(raw);
  return rows.map((slot) => {
    const time24 = slot.time ?? slot.start_time ?? slot.slot_time;
    const label = formatSlotTime24To12(time24);
    const available = isSlotAvailable(slot);
    return {
      time: label,
      time24,
      available,
      status: available ? 'available' : 'booked',
    };
  });
}
