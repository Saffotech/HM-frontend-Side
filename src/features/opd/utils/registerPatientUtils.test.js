import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRegisterPatient } from './registerPatientUtils.js';

test('registration requires gender and Aadhaar, including for revisits', () => {
  const errors = validateRegisterPatient(
    {
      name: 'Asha Patil',
      phone: '9876543210',
      dob: '1990-01-01',
      gender: '',
      aadhaar: '',
    },
    { isRevisit: true },
  );

  assert.deepEqual(errors, {
    gender: 'Gender is required',
    aadhaar: 'Aadhaar is required',
  });
});

test('registration accepts valid required patient details', () => {
  const errors = validateRegisterPatient({
    name: 'Asha Patil',
    phone: '9876543210',
    dob: '1990-01-01',
    gender: 'Female',
    aadhaar: '1234-5678-9012',
  });

  assert.deepEqual(errors, {});
});
