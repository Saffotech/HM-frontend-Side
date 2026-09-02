/**
 * Build Lab Charges rows for IPD Pricing without a dedicated IPD lab API.
 * Prefers lab catalog when available; falls back to OPD bill items from pricing.
 */

import { inferTestCategory } from '@/shared/utils/doctorLabView';

const NON_LAB_BILL_NAMES = new Set([
  'consultation',
  'medicines',
  'dressing',
  'injection',
  'registration',
]);

function isLabLikeBillItem(name) {
  const label = String(name || '').trim();
  if (!label) return false;
  const key = label.toLowerCase();
  if (NON_LAB_BILL_NAMES.has(key)) return false;
  const category = inferTestCategory(label);
  return category === 'Radiology' || category === 'Laboratory';
}

export function mapCatalogTestsToLabRows(catalogTests = [], departments = []) {
  const deptById = new Map(departments.map((d) => [String(d.id), d.name]));
  return catalogTests
    .filter((test) => test.active && String(test.testName || '').trim())
    .map((test) => ({
      key: `lab-test-${test.id}`,
      name: test.testName,
      departmentName:
        test.departmentName ||
        deptById.get(String(test.departmentId)) ||
        deptById.get(String(test.department_id)) ||
        inferTestCategory(test.testName),
      rowType: 'test',
      fee: test.price,
      source: 'catalog',
    }));
}

export function mapBillItemsToLabRows(billItems = []) {
  return billItems
    .filter(
      (item) =>
        item?.is_active !== false &&
        isLabLikeBillItem(item?.name),
    )
    .map((item) => ({
      key: `bill-item-${item.id ?? item.name}`,
      name: item.name,
      departmentName: inferTestCategory(item.name),
      rowType: 'bill_item',
      fee: item.price,
      source: 'bill_items',
    }));
}
