/** Sidebar sections on the doctor home screen. Dashboard is the default and is omitted from the URL. */
export const DOCTOR_SECTIONS = ['dashboard', 'patients', 'labs', 'schedule', 'notifications'];

export function parseDoctorSection(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  return DOCTOR_SECTIONS.includes(value) ? value : null;
}

/** Copy search params and set or clear `section`. */
export function withDoctorSection(searchParams, section) {
  const next = new URLSearchParams(searchParams);
  const parsed = parseDoctorSection(section);
  if (!parsed || parsed === 'dashboard') next.delete('section');
  else next.set('section', parsed);
  return next;
}

