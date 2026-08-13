import { getDepartments, getDoctorsByDepartment } from '@/features/opd/api/reference';
import { filterClinicalDepartments, filterLabTechDepartments } from '@/shared/utils/labDepartments';

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

async function fetchMappedDepartments(token) {
  const rows = await getDepartments(token);
  const list = Array.isArray(rows) ? rows : (rows?.departments ?? rows?.items ?? []);
  return list.map(apiToUiDepartment).filter(Boolean);
}

/** Clinical visit departments (Cardiology, Pediatrics, …). Hides LAB/RAD. */
export async function listDepartments(token) {
  return filterClinicalDepartments(await fetchMappedDepartments(token));
}

/** Laboratory + Radiology only — doctor lab-order routing. */
export async function listLabRoutingDepartments(token) {
  return filterLabTechDepartments(await fetchMappedDepartments(token));
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
