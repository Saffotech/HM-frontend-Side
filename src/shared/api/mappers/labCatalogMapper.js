/**
 * Lab catalog (lab_tests) ↔ UI mapping.
 * Catalog price is current configuration only — never use it to reprice old orders.
 */

import {
  formatCurrency,
  formatMoneyDigits,
} from '@/shared/utils/formatCurrency';

export function formatCatalogPrice(price) {
  return formatMoneyDigits(price, { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

export function formatOrderPrice(price) {
  return formatCurrency(price, { empty: '—' });
}

export function apiToUiLabCatalogTest(api) {
  if (!api) return null;
  const id = api.id ?? api.lab_test_id;
  if (id == null) return null;
  const testName = api.test_name ?? api.testName ?? '';
  const price = api.price != null ? String(api.price) : null;
  const priceDisplay = formatOrderPrice(price);
  return {
    id: Number(id),
    testName,
    departmentId: api.department_id ?? api.departmentId ?? null,
    price,
    active: api.active !== false,
    label: priceDisplay !== '—' ? `${testName} (${priceDisplay})` : testName,
    createdAt: api.created_at ?? api.createdAt ?? null,
    updatedAt: api.updated_at ?? api.updatedAt ?? null,
  };
}

export function mapLabCatalogList(raw) {
  const list = raw?.tests ?? raw?.items ?? (Array.isArray(raw) ? raw : []);
  return list.map(apiToUiLabCatalogTest).filter(Boolean);
}
