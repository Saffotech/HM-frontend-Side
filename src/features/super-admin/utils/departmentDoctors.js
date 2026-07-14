export function staffDisplayName(user) {
  if (!user) return '—';
  if (user.full_name) return user.full_name;
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '—';
}

export function findRoleIdByName(roles, roleName) {
  return roles?.find((role) => role.name === roleName)?.id ?? null;
}

export function buildDoctorCountByDepartment(doctors = []) {
  return doctors.reduce((acc, doctor) => {
    if (doctor.department_id != null) {
      acc[doctor.department_id] = (acc[doctor.department_id] || 0) + 1;
    }
    return acc;
  }, {});
}

export function filterDoctorsByDepartment(doctors = [], departmentId) {
  if (!departmentId) return [];
  return doctors.filter((doctor) => doctor.department_id === departmentId);
}
