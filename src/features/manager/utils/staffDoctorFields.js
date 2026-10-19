/** Doctor-only staff detail fields managed by admin (PATCH /users/{id}). */

export function isDoctorStaffRole(roleName) {
  return String(roleName || '').trim().toLowerCase() === 'doctor';
}

export function staffDoctorFieldsFromUser(user) {
  if (!user) {
    return { specialization: '', medical_license_number: '' };
  }
  return {
    specialization: user.specialization ?? '',
    medical_license_number: user.medical_license_number ?? user.medical_license ?? '',
  };
}

export function buildStaffDoctorPatch(form, roleName) {
  if (!isDoctorStaffRole(roleName)) return {};
  return {
    specialization: (form.specialization || '').trim() || null,
    medical_license_number: (form.medical_license_number || '').trim() || null,
  };
}
