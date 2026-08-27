/**
 * Lab catalog (lab_tests) ↔ UI mapping.
 * Catalog price is current configuration only — never use it to reprice old orders.
 */

export function formatCatalogPrice(price) {
  if (price == null || price === '') return '';
  const n = Number(price);
  if (!Number.isFinite(n)) return String(price);
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatOrderPrice(price) {
  if (price == null || price === '') return '—';
  const formatted = formatCatalogPrice(price);
  return formatted ? `₹${formatted}` : '—';
}

export function apiToUiLabCatalogTest(api) {
  if (!api) return null;
  const id = api.id ?? api.lab_test_id;
  if (id == null) return null;
  const testName = api.test_name ?? api.testName ?? '';
  const price = api.price != null ? String(api.price) : null;
  const priceLabel = formatCatalogPrice(price);
  return {
    id: Number(id),
    testName,
    departmentId: api.department_id ?? api.departmentId ?? null,
    price,
    active: api.active !== false,
    label: priceLabel ? `${testName} (₹${priceLabel})` : testName,
    createdAt: api.created_at ?? api.createdAt ?? null,
    updatedAt: api.updated_at ?? api.updatedAt ?? null,
  };
}

export function mapLabCatalogList(raw) {
  const list = raw?.tests ?? raw?.items ?? (Array.isArray(raw) ? raw : []);
  return list.map(apiToUiLabCatalogTest).filter(Boolean);
}
