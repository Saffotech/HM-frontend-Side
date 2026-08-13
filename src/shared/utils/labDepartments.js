/** Laboratory / Radiology routing departments (not clinical visit departments). */

export const LAB_DEPT_CODE = {
  LAB: 'LAB',
  RAD: 'RAD',
};

const LAB_OR_RAD = new Set([LAB_DEPT_CODE.LAB, LAB_DEPT_CODE.RAD]);

function normalizeDeptToken(raw) {
  const value = String(raw ?? '').trim().toUpperCase();
  if (!value) return '';
  if (value === 'LABORATORY' || value === 'LAB') return LAB_DEPT_CODE.LAB;
  if (value === 'RADIOLOGY' || value === 'RAD' || value === 'IMAGING') return LAB_DEPT_CODE.RAD;
  return value;
}

export function asDepartmentList(departments) {
  if (Array.isArray(departments)) return departments;
  if (Array.isArray(departments?.departments)) return departments.departments;
  if (Array.isArray(departments?.items)) return departments.items;
  if (Array.isArray(departments?.data)) return departments.data;
  return [];
}

export function departmentCode(deptOrCode) {
  if (deptOrCode == null) return '';
  if (typeof deptOrCode === 'string' || typeof deptOrCode === 'number') {
    return normalizeDeptToken(deptOrCode);
  }
  const fromCode = normalizeDeptToken(
    deptOrCode.code ?? deptOrCode.department_code ?? deptOrCode.departmentCode,
  );
  if (fromCode) return fromCode;
  return normalizeDeptToken(
    deptOrCode.name ?? deptOrCode.department_name ?? deptOrCode.departmentName,
  );
}

function nameMatchesLabOrRad(name, code) {
  const n = String(name ?? '').toLowerCase();
  if (!n) return false;
  if (code === LAB_DEPT_CODE.LAB) {
    return /laborator|\bpathology\b/.test(n) || n === 'lab' || n === 'labs';
  }
  if (code === LAB_DEPT_CODE.RAD) {
    return /radiolog|\bimaging\b/.test(n);
  }
  return false;
}

export function findLabOrRadDepartment(departments, code) {
  const target = departmentCode(code);
  if (!isLabOrRadCode(target)) return null;
  const list = asDepartmentList(departments);
  return (
    list.find((d) => departmentCode(d) === target)
    || list.find((d) => nameMatchesLabOrRad(d?.name ?? d?.department_name, target))
    || null
  );
}

export function isLabOrRadCode(code) {
  return LAB_OR_RAD.has(departmentCode(code));
}

export function isLabOrRadDepartment(dept) {
  return isLabOrRadCode(dept);
}

/** Clinical visit departments — hide Laboratory and Radiology. */
export function filterClinicalDepartments(departments = []) {
  return departments.filter((d) => !isLabOrRadDepartment(d));
}

/** Staff register: doctors get clinical depts only (no LAB/RAD). */
export function filterDoctorStaffDepartments(departments = []) {
  return filterClinicalDepartments(departments);
}

/** Lab technicians may only be assigned Laboratory or Radiology. */
export function filterLabTechDepartments(departments = []) {
  return asDepartmentList(departments).filter(isLabOrRadDepartment);
}

export function resolveLabDepartmentId(departments, code) {
  const row = findLabOrRadDepartment(departments, code);
  if (!row?.id) return null;
  const n = Number(row.id);
  return Number.isFinite(n) ? n : null;
}

export function labDepartmentLabel(codeOrDept) {
  const code = departmentCode(codeOrDept);
  if (code === LAB_DEPT_CODE.RAD) return 'Radiology';
  if (code === LAB_DEPT_CODE.LAB) return 'Laboratory';
  return '';
}

export function labDepartmentLabelFromUser(user) {
  if (!user) return '';
  const deptObj = typeof user.department === 'object' ? user.department : null;
  return (
    labDepartmentLabel(deptObj)
    || labDepartmentLabel(user.department_code ?? user.departmentCode)
    || labDepartmentLabel(user.department_name ?? user.departmentName)
    || labDepartmentLabel(typeof user.department === 'string' ? user.department : '')
  );
}

export function inferLabDeptCodeFromOrder(order, departments = []) {
  if (!order) return '';
  if (order.departmentId != null && departments.length) {
    const row = departments.find((d) => String(d.id) === String(order.departmentId));
    if (row) return departmentCode(row);
  }
  const fromLabel = departmentCode(
    order.departmentCode
      ?? order.department_code
      ?? order.departmentName
      ?? order.department_name,
  );
  if (isLabOrRadCode(fromLabel)) return fromLabel;
  if (String(order.category ?? '').toLowerCase() === 'radiology') return LAB_DEPT_CODE.RAD;
  if (order.category) return LAB_DEPT_CODE.LAB;
  return '';
}

/** Pending-tests Category filter options by lab tech department. */
export const LAB_ORDER_CATEGORY_OPTIONS_BY_DEPT = {
  [LAB_DEPT_CODE.LAB]: [
    'Blood Test',
    'Urine Test',
    'Stool Test',
    'Biochemistry',
    'Hematology',
    'Microbiology',
    'Histopathology',
    'CBC',
    'Lipid Profile',
    'Blood Sugar',
    'Urine Routine',
  ],
  [LAB_DEPT_CODE.RAD]: [
    'X-Ray',
    'Ultrasound (USG)',
    'CT Scan',
    'MRI',
    'Mammography',
    'X-Ray Chest',
    'MRI Brain',
    'CT Scan Abdomen',
  ],
};

/** Values that match LabTestOrder.category on the API (not individual test names). */
const API_CATEGORY_VALUES = new Set([
  'Blood Test',
  'Blood',
  'Urine',
  'Microbiology',
  'Biochemistry',
  'Radiology',
]);

export function isApiLabOrderCategory(value) {
  return API_CATEGORY_VALUES.has(String(value ?? '').trim());
}

/**
 * Match pending-tests Category filter against order category or test name.
 * Radiology options include specific tests (X-Ray, MRI, …) which live on test_name.
 */
export function orderMatchesCategoryFilter(order, category) {
  if (!category || category === 'all') return true;
  const needle = String(category).trim().toLowerCase();
  if (!needle) return true;
  const cat = String(order?.category ?? '').trim().toLowerCase();
  const test = String(order?.testName ?? '').trim().toLowerCase();
  if (cat === needle || test === needle) return true;
  if (test.includes(needle) || (needle.length >= 3 && needle.includes(test) && test)) {
    return true;
  }
  return false;
}

export function labOrderCategoryOptionsForDept(deptCode) {
  const code = departmentCode(deptCode);
  if (code === LAB_DEPT_CODE.RAD) return [...LAB_ORDER_CATEGORY_OPTIONS_BY_DEPT.RAD];
  if (code === LAB_DEPT_CODE.LAB) return [...LAB_ORDER_CATEGORY_OPTIONS_BY_DEPT.LAB];
  // Unknown dept: show both until profile loads
  return [
    ...LAB_ORDER_CATEGORY_OPTIONS_BY_DEPT.LAB,
    ...LAB_ORDER_CATEGORY_OPTIONS_BY_DEPT.RAD,
  ];
}

export function isOrderForLabDept(order, deptCode) {
  const tech = departmentCode(deptCode);
  if (!isLabOrRadCode(tech)) return true;
  const orderDept = inferLabDeptCodeFromOrder(order);
  if (isLabOrRadCode(orderDept)) return orderDept === tech;
  // Fallback when order has no department fields
  if (tech === LAB_DEPT_CODE.RAD) {
    return String(order?.category ?? '').toLowerCase() === 'radiology';
  }
  return String(order?.category ?? '').toLowerCase() !== 'radiology';
}

export function roleRequiresDepartment(roleName) {
  return roleName === 'doctor' || roleName === 'lab_technician';
}

export function isLabTechnicianRole(roleName) {
  return roleName === 'lab_technician';
}

export function departmentOptionsForRole(departments = [], roleName) {
  const list = asDepartmentList(departments);
  if (roleName === 'lab_technician') return filterLabTechDepartments(list);
  if (roleName === 'doctor') return filterDoctorStaffDepartments(list);
  return [];
}

/** Fixed Lab Technician department dropdown: Laboratory | Radiology. */
export const LAB_TECH_DEPARTMENT_OPTIONS = [
  { value: LAB_DEPT_CODE.LAB, label: 'Laboratory' },
  { value: LAB_DEPT_CODE.RAD, label: 'Radiology' },
];

export function staffDepartmentSelectOptions(departments = [], roleName) {
  if (isLabTechnicianRole(roleName)) {
    return LAB_TECH_DEPARTMENT_OPTIONS.map(({ value: code, label }) => {
      const id = resolveLabDepartmentId(departments, code);
      return { value: id != null ? String(id) : code, label };
    });
  }
  return departmentOptionsForRole(departments, roleName).map((dept) => ({
    value: String(dept.id),
    label: dept.name,
  }));
}

export function labTechCodeFromDepartmentId(departments, departmentId) {
  if (departmentId == null || departmentId === '') return '';
  const token = String(departmentId).trim().toUpperCase();
  if (token === LAB_DEPT_CODE.LAB || token === LAB_DEPT_CODE.RAD) return token;
  const row = asDepartmentList(departments).find((d) => String(d.id) === String(departmentId));
  const code = departmentCode(row);
  if (isLabOrRadCode(code)) return code;
  if (nameMatchesLabOrRad(row?.name, LAB_DEPT_CODE.LAB)) return LAB_DEPT_CODE.LAB;
  if (nameMatchesLabOrRad(row?.name, LAB_DEPT_CODE.RAD)) return LAB_DEPT_CODE.RAD;
  return '';
}

export function staffDepartmentSelectValue(departments, roleName, departmentId) {
  if (!isLabTechnicianRole(roleName)) return departmentId ? String(departmentId) : '';
  if (departmentId == null || departmentId === '') return '';
  const options = staffDepartmentSelectOptions(departments, roleName);
  const raw = String(departmentId);
  if (options.some((o) => o.value === raw)) return raw;
  const code = labTechCodeFromDepartmentId(departments, departmentId);
  const match = options.find((o) => departmentCode(o.value) === code || o.value === code);
  return match?.value ?? code;
}

/** Numeric department_id for register/update payload. */
export function resolveStaffDepartmentPayloadId(departments, roleName, raw) {
  if (raw == null || raw === '') return null;
  const asCode = departmentCode(raw);
  if (isLabTechnicianRole(roleName) || isLabOrRadCode(asCode)) {
    const fromCode = resolveLabDepartmentId(
      departments,
      labTechCodeFromDepartmentId(departments, raw) || asCode,
    );
    if (fromCode) return fromCode;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isLabDepartmentUnassignedError(error) {
  if (error?.status !== 403) return false;
  const msg = String(error?.message ?? '').toLowerCase();
  return (
    msg.includes('department')
    || msg.includes('not assigned')
    || msg.includes('assign')
  );
}

export const LAB_DEPT_UNASSIGNED_MESSAGE =
  'Your lab department is not assigned. Contact admin to assign Laboratory or Radiology.';
