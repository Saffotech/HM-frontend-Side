export function validateAppointment(values) {
  const errors = {};
  if (!values.patientId) errors.patientId = 'Patient is required';
  if (!values.doctorId) errors.doctorId = 'Doctor is required';
  if (!values.dateStr) {
    errors.dateStr = 'Date is required';
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(values.dateStr);
    picked.setHours(0, 0, 0, 0);
    if (picked < today) errors.dateStr = 'Date cannot be in the past';
  }
  return errors;
}

export const BOOK_APPOINTMENT_INITIAL_VALUES = {
  patientId: '',
  deptId: '',
  doctorId: '',
  dateStr: '',
  time: '',
  reason: '',
  notes: '',
};
