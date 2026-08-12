import { createDepartment, listDepartments } from '@/features/admin/api/admin';
import {
  departmentCode,
  isLabOrRadCode,
  resolveLabDepartmentId,
  resolveStaffDepartmentPayloadId,
} from '@/shared/utils/labDepartments';

/**
 * Resolve Laboratory / Radiology to a numeric department_id.
 * If the department is missing, create it via the existing admin API (frontend-only).
 */
export async function ensureLabTechDepartmentId(departments, selectedValue) {
  const resolved = resolveStaffDepartmentPayloadId(
    departments,
    'lab_technician',
    selectedValue,
  );
  if (resolved) return resolved;

  const code = departmentCode(selectedValue);
  if (!isLabOrRadCode(code)) return null;

  try {
    const created = await createDepartment({
      name: code === 'RAD' ? 'Radiology' : 'Laboratory',
      code,
    });
    const id = created?.department?.id ?? created?.id;
    if (id != null) {
      const n = Number(id);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    const fresh = await listDepartments();
    return resolveLabDepartmentId(fresh, code);
  }

  return null;
}
