import { isLabDepartment } from '@/shared/utils/labDepartments';

const EMPTY = {
  name: '',
  code: '',
  description: '',
  is_active: true,
  kind: 'doctor',
};

export function emptyDepartmentForm() {
  return { ...EMPTY };
}

export function departmentToForm(department) {
  if (!department) return emptyDepartmentForm();
  return {
    name: department.name ?? '',
    code: department.code ?? '',
    description: department.description ?? '',
    is_active: department.is_active !== false,
    kind: isLabDepartment(department) ? 'lab' : 'doctor',
  };
}

export function buildDepartmentPayload(form, { includeStatus = false } = {}) {
  const payload = {
    name: form.name.trim(),
    code: form.code.trim() || null,
    description: form.description.trim() || null,
    kind: form.kind,
  };
  if (includeStatus) {
    payload.is_active = Boolean(form.is_active);
  }
  return payload;
}
