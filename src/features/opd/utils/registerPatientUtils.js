export function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export function formatAppointmentDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function validateRegisterPatient(values, { isRevisit = false } = {}) {
  const errors = {};
  if (!values.name?.trim()) errors.name = 'Name is required';

  const phone = (values.phone || '').replace(/\s/g, '');
  if (!/^\d{10}$/.test(phone)) errors.phone = 'Phone must be 10 digits';

  if (!values.dob) errors.dob = 'Date of birth is required';

  if (!isRevisit) {
    const aadhaarDigits = (values.aadhaar || '').replace(/\D/g, '');
    if (aadhaarDigits.length !== 12) {
      errors.aadhaar = 'Aadhaar must be 12 digits (XXXX-XXXX-XXXX)';
    }
  }

  return errors;
}

export const REGISTER_PATIENT_INITIAL_FORM = {
  name: '',
  gender: '',
  phone: '',
  dob: '',
  address: '',
  state: '',
  aadhaar: '',
  bloodGroup: '',
  deptId: '',
  doctorId: '',
};

