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

export const LAB_TEST_OPTIONS = [
  ...LAB_TESTS_BY_DEPARTMENT.LAB,
  ...LAB_TESTS_BY_DEPARTMENT.RAD,
];

export const LAB_CATEGORIES = ['Blood', 'Radiology', 'Urine', 'Other'];

export const LAB_PRIORITIES = ['Normal', 'Urgent'];

export function testsForLabDepartment(code) {
  const key = String(code ?? '').toUpperCase();
  return LAB_TESTS_BY_DEPARTMENT[key] ?? [];
}

export function inferLabCategory(testName = '', deptCode = '') {
  if (String(deptCode).toUpperCase() === 'RAD') return 'Radiology';
  if (/x-ray|mri|ct|scan|ecg|radiology|ultrasound|usg|mammography/i.test(testName)) {
    return 'Radiology';
  }
  if (/urine/i.test(testName)) return 'Urine';
  if (/stool/i.test(testName)) return 'Other';
  if (testName) return 'Blood';
  return 'Blood';
}

export const DEFAULT_MEDICINE = {
  name: '',
  dosage: '',
  frequency: '1-0-1',
  duration: '5 days',
  instructions: 'After food',
};
