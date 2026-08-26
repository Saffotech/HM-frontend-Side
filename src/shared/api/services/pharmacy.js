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
    .map((row) => {
      const itemId = Number(row.prescription_item_id);
      const qty = Number(row.quantity_dispensed);
      if (!Number.isInteger(itemId) || itemId <= 0) return null;
      if (!Number.isInteger(qty) || qty <= 0) return null;

      const amountRaw = Number(row.amount);
      const unitPriceRaw = Number(row.unit_price);
      const amount =
        Number.isFinite(amountRaw) && amountRaw >= 0
          ? Math.round(amountRaw * 100) / 100
          : 0;
      const unit_price =
        Number.isFinite(unitPriceRaw) && unitPriceRaw >= 0
          ? Math.round(unitPriceRaw * 100) / 100
          : qty > 0
            ? Math.round((amount / qty) * 100) / 100
            : 0;

      return {
        prescription_item_id: itemId,
        quantity_dispensed: qty,
        amount,
        unit_price,
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
