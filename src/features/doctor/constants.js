export const LAB_DEPARTMENTS = [
  { code: 'LAB', label: 'Laboratory' },
  { code: 'RAD', label: 'Radiology' },
];

export const LAB_TESTS_BY_DEPARTMENT = {
  LAB: [
    'Blood Test',
    'Urine Test',
    'Stool Test',
    'Biochemistry',
    'Hematology',
    'Microbiology',
    'Histopathology',
    'CBC',
    'Lipid Profile',
    'Blood Sugar',
    'Urine Routine',
  ],
  RAD: [
    'X-Ray',
    'Ultrasound (USG)',
    'CT Scan',
    'MRI',
    'Mammography',
    'X-Ray Chest',
    'MRI Brain',
    'CT Scan Abdomen',
  ],
};

/** @deprecated Prefer GET /lab-catalog?active=true — kept as temporary fallback. */
export const LAB_TEST_OPTIONS = [
  ...LAB_TESTS_BY_DEPARTMENT.LAB,
  ...LAB_TESTS_BY_DEPARTMENT.RAD,
];

export const LAB_CATEGORIES = ['Laboratory', 'Radiology'];

export const LAB_PRIORITIES = ['Normal', 'Urgent'];

export const OTHER_LAB_TEST = '__other__';

export function testsForLabDepartment(code) {
  const key = String(code ?? '').toUpperCase();
  return LAB_TESTS_BY_DEPARTMENT[key] ?? [];
}

export function inferLabCategory(testName = '', deptCode = '') {
  if (String(deptCode).toUpperCase() === 'RAD') return 'Radiology';
  if (String(deptCode).toUpperCase() === 'LAB') return 'Laboratory';
  if (/x-ray|mri|ct|scan|ecg|radiology|ultrasound|usg|mammography/i.test(testName)) {
    return 'Radiology';
  }
  return 'Laboratory';
}

/** Max length for special instructions (UI + API). */
export const MEDICINE_INSTRUCTIONS_MAX = 200;

export const MEDICINE_FORM_OPTIONS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Drops',
  'Cream',
  'Ointment',
  'Inhaler',
];

/** Dropdown sentinel — custom text is stored in `form`. */
export const MEDICINE_FORM_OTHER = 'Other';

export const MEDICINE_FORM_CUSTOM_MAX = 100;

export function isMedicineFormPreset(value) {
  return MEDICINE_FORM_OPTIONS.includes(String(value ?? '').trim());
}

export const MEDICINE_ROUTE_OPTIONS = [
  'Oral',
  'Intravenous (IV)',
  'Intramuscular (IM)',
  'Subcutaneous (SC)',
  'Topical',
  'Inhalation',
  'Sublingual',
];

/** Dropdown sentinel — custom text is stored in `route`. */
export const MEDICINE_ROUTE_OTHER = 'Other';

export const MEDICINE_ROUTE_CUSTOM_MAX = 100;

/** Map legacy short codes to current dropdown labels. */
const MEDICINE_ROUTE_ALIASES = {
  IV: 'Intravenous (IV)',
  IM: 'Intramuscular (IM)',
  SC: 'Subcutaneous (SC)',
};

export function normalizeMedicineRoute(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (MEDICINE_ROUTE_OPTIONS.includes(raw)) return raw;
  const aliased = MEDICINE_ROUTE_ALIASES[raw.toUpperCase()];
  if (aliased) return aliased;
  return raw;
}

export function isMedicineRoutePreset(value) {
  const normalized = normalizeMedicineRoute(value);
  return MEDICINE_ROUTE_OPTIONS.includes(normalized);
}

export const MEDICINE_FREQUENCY_OPTIONS = [
  '1-0-1',
  '1-1-1',
  '1-0-0',
  '0-0-1',
  '1-1-0',
];

/** Dropdown sentinel — custom text is stored in `frequency`. */
export const MEDICINE_FREQUENCY_OTHER = 'Other';

export const MEDICINE_FREQUENCY_CUSTOM_MAX = 100;

export function isMedicineFrequencyPreset(value) {
  return MEDICINE_FREQUENCY_OPTIONS.includes(String(value ?? '').trim());
}

export const MEDICINE_TIMING_OPTIONS = [
  'After food',
  'Before food',
  'Empty stomach',
  'With food',
  'At bedtime',
];

/** Dropdown sentinel — custom text is stored in `timing`. */
export const MEDICINE_TIMING_OTHER = 'Other';

export const MEDICINE_TIMING_CUSTOM_MAX = 100;

export function isMedicineTimingPreset(value) {
  return MEDICINE_TIMING_OPTIONS.includes(String(value ?? '').trim());
}

export const MEDICINE_DURATION_UNIT_OPTIONS = ['Days', 'Weeks', 'Months'];

/** Default UI state for one prescription medicine card. */
export const DEFAULT_MEDICINE = {
  name: '',
  dosage: '',
  form: 'Tablet',
  route: 'Oral',
  frequency: '1-0-1',
  timing: 'After food',
  duration: '',
  durationValue: '',
  durationUnit: 'Days',
  quantity: '',
  instructions: '',
};
