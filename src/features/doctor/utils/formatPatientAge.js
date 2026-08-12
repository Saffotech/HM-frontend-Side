/**
 * Doctor UI patient age display: years (y), months (m), or days (d).
 */

function parseDob(dob) {
  if (dob == null || dob === '') return null;
  if (dob instanceof Date) {
    return Number.isNaN(dob.getTime()) ? null : dob;
  }
  const raw = String(dob).trim();
  const isoDay = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDay) {
    const d = new Date(Number(isoDay[1]), Number(isoDay[2]) - 1, Number(isoDay[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Calendar age parts from date of birth → today. */
export function getAgePartsFromDob(dob, now = new Date()) {
  const born = parseDob(dob);
  if (!born) return null;

  let years = now.getFullYear() - born.getFullYear();
  let months = now.getMonth() - born.getMonth();
  let days = now.getDate() - born.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return null;

  const totalDays = Math.floor((now.getTime() - born.getTime()) / (1000 * 60 * 60 * 24));

  return { years, months, days, totalDays: Math.max(totalDays, 0) };
}

/**
 * Format age for doctor UI.
 * - ≥ 1 year → `2y`
 * - ≥ 1 month and < 1 year → `6m`
 * - < 1 month → `15d`
 *
 * Prefers DOB when available; falls back to whole-year `age` from API.
 */
export function formatPatientAge({ age, dob } = {}, now = new Date()) {
  const parts = getAgePartsFromDob(dob, now);
  if (parts) {
    if (parts.years >= 1) return `${parts.years}y`;
    if (parts.months >= 1) return `${parts.months}m`;
    return `${parts.totalDays}d`;
  }

  if (age == null || age === '') return null;
  const years = Number(age);
  if (!Number.isFinite(years) || years < 0) return null;
  if (years >= 1) return `${Math.floor(years)}y`;
  // API only sends whole years — infants are 0 without DOB
  return '<1y';
}

/** Age · Gender cell helper */
export function formatPatientAgeGender({ age, dob, gender } = {}) {
  const agePart = formatPatientAge({ age, dob });
  const genderPart = gender && gender !== '—' ? gender : null;
  if (agePart && genderPart) return `${agePart} · ${genderPart}`;
  if (agePart) return agePart;
  if (genderPart) return genderPart;
  return '—';
}
