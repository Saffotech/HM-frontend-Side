import { LAB_TESTS_BY_DEPARTMENT } from '@/features/doctor/constants';
import { departmentCode, LAB_DEPT_CODE } from '@/shared/utils/labDepartments';

function looksLikeRadiologyTest(name) {
  return /x-?ray|mri|ct\s*scan|\bct\b|ultrasound|usg|mammograph|radiolog|imaging/i.test(
    String(name ?? ''),
  );
}

function hintMatch(name, hints) {
  const needle = String(name ?? '').trim().toLowerCase();
  if (!needle) return false;
  return hints.some((h) => h.toLowerCase() === needle);
}

/**
 * Infer numeric LAB / RAD department_ids from catalog rows when OPD
 * department lists are unavailable (doctors often lack opd:view).
 */
export function inferLabRadDepartmentIds(catalogTests = []) {
  let labId = null;
  let radId = null;

  for (const t of catalogTests) {
    if (t?.departmentId == null) continue;
    const id = Number(t.departmentId);
    if (!Number.isFinite(id)) continue;
    if (!labId && hintMatch(t.testName, LAB_TESTS_BY_DEPARTMENT.LAB)) labId = id;
    if (!radId && hintMatch(t.testName, LAB_TESTS_BY_DEPARTMENT.RAD)) radId = id;
  }

  if (labId != null && radId != null) {
    return { [LAB_DEPT_CODE.LAB]: labId, [LAB_DEPT_CODE.RAD]: radId };
  }

  const scores = new Map();
  for (const t of catalogTests) {
    if (t?.departmentId == null) continue;
    const id = Number(t.departmentId);
    if (!Number.isFinite(id)) continue;
    const delta = looksLikeRadiologyTest(t.testName) ? 1 : -1;
    scores.set(id, (scores.get(id) || 0) + delta);
  }

  for (const [id, score] of scores) {
    if (score > 0 && radId == null) radId = id;
    if (score <= 0 && labId == null) labId = id;
  }

  return { [LAB_DEPT_CODE.LAB]: labId, [LAB_DEPT_CODE.RAD]: radId };
}

/**
 * Filter active catalog tests for the selected Laboratory / Radiology dept.
 * Prefers an explicit numeric departmentId; otherwise infers from catalog data.
 */
export function filterCatalogTestsForDept(catalogTests = [], deptCode, departmentId = null) {
  if (!catalogTests.length) return [];

  const numericDept =
    departmentId != null && Number.isFinite(Number(departmentId)) && Number(departmentId) > 0
      ? Number(departmentId)
      : null;

  if (numericDept != null) {
    return catalogTests.filter((t) => Number(t.departmentId) === numericDept);
  }

  const code = departmentCode(deptCode);
  if (!code) return catalogTests;

  const inferred = inferLabRadDepartmentIds(catalogTests);
  const resolved = inferred[code];
  if (resolved != null) {
    return catalogTests.filter((t) => Number(t.departmentId) === resolved);
  }

  if (code === LAB_DEPT_CODE.RAD) {
    return catalogTests.filter((t) => looksLikeRadiologyTest(t.testName));
  }
  if (code === LAB_DEPT_CODE.LAB) {
    return catalogTests.filter((t) => !looksLikeRadiologyTest(t.testName));
  }
  return catalogTests;
}
