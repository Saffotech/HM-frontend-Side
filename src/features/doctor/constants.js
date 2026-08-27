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

export const DEFAULT_MEDICINE = {
  name: '',
  dosage: '',
  frequency: '1-0-1',
  duration: '5 days',
  instructions: 'After food',
};
