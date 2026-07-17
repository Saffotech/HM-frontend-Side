/**
 * Pharmacy API service layer — live backend HTTP only.
 */

import {
  getPrescriptions,
  getPrescriptionById,
  dispenseMedicine,
  getDispenseHistory,
} from '@/features/pharmacy/api/pharmacy';
import {
  mapPharmacyPrescriptionList,
  apiToUiPharmacyPrescriptionDetail,
  mapDispenseHistory,
} from '@/shared/api/mappers/pharmacyMapper';

export async function fetchPrescriptions(params = {}, token) {
  const raw = await getPrescriptions(
    { status: params.status, search: params.search },
    token
  );
  const total = raw?.total ?? raw?.prescriptions?.length ?? 0;
  return mapPharmacyPrescriptionList(raw, { page: 1, per_page: Math.max(total, 1) });
}

export async function fetchPrescriptionById(id, token) {
  const raw = await getPrescriptionById(id, token);
  return apiToUiPharmacyPrescriptionDetail(raw);
}

export async function submitDispense(prescriptionId, body, token) {
  const items = (body?.items ?? [])
    .map(({ prescription_item_id, quantity_dispensed }) => {
      const itemId = Number(prescription_item_id);
      const qty = Number(quantity_dispensed);
      if (!Number.isInteger(itemId) || itemId <= 0) return null;
      if (!Number.isInteger(qty) || qty <= 0) return null;
      return {
        prescription_item_id: itemId,
        quantity_dispensed: qty,
      };
    })
    .filter(Boolean);

  if (!items.length) {
    throw new Error('Enter a dispense quantity for at least one medicine.');
  }

  const payload = { items };
  if (body?.remarks?.trim()) {
    payload.remarks = body.remarks.trim();
  }

  return dispenseMedicine(Number(prescriptionId), payload, token);
}

export async function fetchPrescriptionDispenseHistory(prescriptionId, token) {
  const raw = await getDispenseHistory(token, { page: 1, limit: 100 });
  const rows = mapDispenseHistory(raw);
  return rows.filter((row) => String(row.prescription_id) === String(prescriptionId));
}

export async function fetchDispenseHistory(
  token,
  { page = 1, limit = 20, date_from, date_to } = {}
) {
  const raw = await getDispenseHistory(token, { page, limit, date_from, date_to });
  const data = mapDispenseHistory(raw);

  return {
    data,
    total: raw?.total ?? data.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((raw?.total ?? data.length) / (limit || 1))),
  };
}

export async function fetchPharmacyDashboardStats(token) {
  const raw = await getPrescriptions({ status: 'all' }, token);
  const prescriptions = raw?.prescriptions ?? [];
  return {
    pending: prescriptions.filter((r) => r.status === 'pending').length,
    partially_dispensed: prescriptions.filter((r) => r.status === 'partially_dispensed').length,
    dispensed: prescriptions.filter((r) => r.status === 'dispensed').length,
    total: prescriptions.length,
  };
}
