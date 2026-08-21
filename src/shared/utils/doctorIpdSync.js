/** Cross-tab signal when IPD admissions change — doctor module listens and refreshes. */

export const DOCTOR_IPD_BUMP_KEY = 'hms:doctor-ipd-bump';
export const DOCTOR_IPD_BUMP_EVENT = 'hms:doctor-ipd-bump';

export function bumpDoctorIpdCache() {
  try {
    localStorage.setItem(DOCTOR_IPD_BUMP_KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(DOCTOR_IPD_BUMP_EVENT));
}
