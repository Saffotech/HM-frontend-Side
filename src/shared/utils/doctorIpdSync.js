/** Cross-tab signal when IPD admissions change — doctor module listens and refreshes. */

import { writeHospitalBump } from '../../components/security/hospitalBrowserStorage.js';

export const DOCTOR_IPD_BUMP_KEY = 'hms:doctor-ipd-bump';
export const DOCTOR_IPD_BUMP_EVENT = 'hms:doctor-ipd-bump';

export function bumpDoctorIpdCache() {
  writeHospitalBump(DOCTOR_IPD_BUMP_KEY);
}
