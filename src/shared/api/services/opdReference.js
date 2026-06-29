import { getDepartments, getDoctorsByDepartment } from '@/features/opd/api/reference';

const DEFAULT_CONSULTATION_FEE = 800;

export function apiToUiDepartment(dept) {
  if (!dept) return null;
  return {
    id: dept.id,
    name: dept.name,
    code: dept.code,
  };
}

export function apiToUiDoctor(doctor) {
  if (!doctor) return null;
  const rawName = doctor.name ?? '';
  const name = rawName.replace(/^Dr\.\s*/i, '').trim() || rawName;
  return {
    id: doctor.id,
    name,
    deptId: doctor.department_id ?? doctor.deptId,
    specialization: doctor.specialization,
    fee: doctor.consultation_fee ?? doctor.fee ?? DEFAULT_CONSULTATION_FEE,
  };
}

export async function listDepartments(token) {
  const rows = await getDepartments(token);
  return (Array.isArray(rows) ? rows : []).map(apiToUiDepartment).filter(Boolean);
}

export async function listDoctorsByDepartment(departmentId, token) {
  const response = await getDoctorsByDepartment(departmentId, token);
  const rows = response?.doctors ?? [];
  return rows.map(apiToUiDoctor).filter(Boolean);
}

export function findDepartment(departments, deptId) {
  if (deptId == null || deptId === '') return null;
  return departments.find((d) => String(d.id) === String(deptId)) ?? null;
}

export function findDoctor(doctors, doctorId) {
  if (doctorId == null || doctorId === '') return null;
  return doctors.find((d) => String(d.id) === String(doctorId)) ?? null;
}
