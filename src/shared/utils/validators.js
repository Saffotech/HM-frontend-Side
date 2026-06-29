export function validatePhone(phone) {
  const cleaned = phone.replace(/\s/g, '');
  return /^(\+91)?\d{10}$/.test(cleaned);
}

/** Digits only, max 10 — for Indian mobile number fields. */
export function formatPhoneInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 10);
}

/** Card/UPI immediate payments require a transaction reference (backend rule). */
export function requiresTransactionReference(paymentMode) {
  const key = String(paymentMode ?? '').toLowerCase();
  return key === 'card' || key === 'upi';
}

export function validatePaymentTransactionRef(paymentMode, ref, { paidAmount = 0, payLater = false } = {}) {
  if (payLater || Number(paidAmount) <= 0) return null;
  if (!requiresTransactionReference(paymentMode)) return null;
  if (!String(ref ?? '').trim()) {
    return 'Transaction reference is required for Card and UPI payments';
  }
  return null;
}

export function validateAadhaar(aadhaar) {
  return /^\d{4}-\d{4}-\d{4}$/.test(aadhaar);
}

export function formatAadhaarInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, '$1-');
}

/** Display stored Aadhaar (12 digits or already dashed). */
export function formatAadhaarDisplay(value) {
  if (!value) return '';
  const str = String(value).trim();
  if (/^\d{4}-\d{4}-\d{4}$/.test(str)) return str;
  return formatAadhaarInput(str);
}

/** Read-only display — mask first 8 digits, show last 4 (e.g. xxxx-xxxx-1234). */
export function maskAadhaarDisplay(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length < 4) return digits;
  return `xxxx-xxxx-${digits.slice(-4)}`;
}

export function validatePatientForm(data) {
  const errors = {};
  if (!data.name?.trim()) errors.name = 'Name is required';
  if (!data.gender) errors.gender = 'Gender is required';
  if (!validatePhone(data.phone || '')) errors.phone = 'Invalid phone number';
  if (!data.address?.trim()) errors.address = 'Address is required';
  if (!data.state?.trim()) errors.state = 'State is required';
  if (!validateAadhaar(data.aadhaar || '')) errors.aadhaar = 'Format: XXXX-XXXX-XXXX';
  if (!data.bloodGroup) errors.bloodGroup = 'Blood group is required';
  if (!data.deptId) errors.deptId = 'Department is required';
  if (!data.doctorId) errors.doctorId = 'Doctor is required';
  return errors;
}
