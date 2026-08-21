import { LAB_DEPARTMENTS } from '@/features/doctor/constants';

/** Static lab/radiology options for IPD consult — avoids GET /opd/departments (opd:view). */
export const IPD_STATIC_LAB_ROUTING_DEPARTMENTS = LAB_DEPARTMENTS.map((dept) => ({
  id: dept.code,
  code: dept.code,
  name: dept.label,
  label: dept.label,
}));

export function ipdStaticLabRoutingDepartments() {
  return IPD_STATIC_LAB_ROUTING_DEPARTMENTS;
}
