import {
  getBills,
  createBill,
  updateBill,
  collectPayment,
  deleteBill,
  getPaymentHistory,
  getVisitInvoice,
  previewBillFees,
  previewBillForRegister,
} from '@/features/opd/billing/api/billing';
import { apiToUiBillPreview } from '@/shared/api/mappers/billPreviewMapper';
import { asList } from '@/shared/api/dataSource';
import {
  apiToUiBill,
  mapInvoiceToUiBill,
  uiToApiBillUpdate,
  uiToApiGenerateBill,
  uiToApiPayment,
} from '@/shared/api/mappers/billMapper';
import { formatOpdDisplayDateTime } from '@/shared/utils/opdDates';
import { fetchAllPages } from '@/shared/utils/fetchAllPages';

function formatPaymentMode(mode) {
  if (!mode) return 'Cash';
  const key = String(mode).toLowerCase();
  if (key === 'cash') return 'Cash';
  if (key === 'card') return 'Card';
  if (key === 'upi' || key === 'online') return 'UPI';
  if (key === 'insurance') return 'Insurance';
  return String(mode).charAt(0).toUpperCase() + String(mode).slice(1);
}

function filterModeParam(activeFilter) {
  if (!activeFilter || activeFilter === 'all') return undefined;
  if (activeFilter === 'UPI') return 'upi';
  return activeFilter.toLowerCase();
}

export function mapPaymentHistoryFromApi(data) {
  const summary = data?.summary ?? {};
  const payments = (data?.payments ?? []).map((p, idx) => {
    const rawDate = p.date ?? p.paid_at;
    return {
    id: p.id ?? `${p.visit_id ?? p.bill_number ?? idx}-pay`,
    patientName: p.patient_name ?? p.patientName ?? '—',
    patientId: p.patient_uid ?? p.patient_id ?? p.patientId ?? '—',
    billId: p.bill_number ?? p.bill_id ?? p.billId ?? '—',
    visitId: p.visit_id ?? p.visitId,
    date: formatOpdDisplayDateTime(rawDate),
    dateSort: rawDate ?? '',
    mode: formatPaymentMode(p.mode ?? p.payment_mode),
    amount: Number(p.amount ?? 0),
    ref: p.reference ?? p.transaction_reference ?? p.ref ?? '—',
    billStatus: p.bill_status ?? p.billStatus,
    billBalance: Number(p.bill_balance ?? p.balance ?? 0),
  };
  });

  return {
    summary: {
      totalCollected: Number(summary.total_collected ?? summary.totalCollected ?? 0),
      cash: Number(summary.cash ?? 0),
      upi: Number(summary.upi ?? summary.online ?? 0),
      card: Number(summary.card ?? 0),
      transactionCount: Number(
        summary.transaction_count ?? summary.count ?? payments.length
      ),
    },
    payments,
    pagination: (() => {
      const page = data?.page ?? data?.pagination?.page ?? 1;
      const limit = data?.limit ?? data?.pagination?.limit ?? 10;
      const totalItems = data?.total ?? data?.pagination?.total ?? payments.length;
      const totalPages =
        data?.total_pages ??
        data?.pagination?.total_pages ??
        Math.max(1, Math.ceil((totalItems || 0) / (limit || 1)));
      return { page, totalPages, totalItems };
    })(),
  };
}

function mapBillsPage(raw) {
  const bills = asList(raw).map(apiToUiBill).filter(Boolean);
  const total = raw?.total ?? bills.length;
  const page = raw?.page ?? 1;
  const limit = raw?.limit ?? bills.length;
  return {
    bills,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((total || 0) / (limit || 1))),
    summary: raw?.summary ?? null,
  };
}

export async function listBillsPage(token, params = {}) {
  const raw = await getBills(token, params);
  return mapBillsPage(raw);
}

export async function listBillsAll(token, params = {}) {
  return fetchAllPages(
    async (page, limit) => {
      const raw = await getBills(token, { ...params, page, limit });
      const mapped = mapBillsPage(raw);
      return {
        items: mapped.bills,
        total: mapped.total,
        totalPages: mapped.totalPages,
      };
    },
    { pageSize: params.limit ?? 100 }
  );
}

export async function getBillInvoice(visitId, token) {
  const raw = await getVisitInvoice(visitId, token);
  return mapInvoiceToUiBill(raw, visitId);
}

export async function addBill(bill, token) {
  return createBill(uiToApiGenerateBill(bill), token).then((response) =>
    apiToUiBill({
      bill_number: response.bill_number,
      visit_id: response.visit_id,
      patient_uid: response.patient_id,
      grand_total: response.grand_total,
      payment_status: response.payment_status,
    })
  );
}

export async function patchBill(visitId, data, token) {
  if (visitId == null || visitId === '') {
    return Promise.reject(new Error('Visit id is required to update a bill'));
  }
  const response = await updateBill(visitId, uiToApiBillUpdate(data), token);
  return apiToUiBill({
    bill_number: response.bill_number,
    visit_id: response.visit_id ?? visitId,
    patient_uid: response.patient_uid,
    grand_total: response.grand_total,
    balance_due: response.balance_due,
    payment_status: response.payment_status,
  });
}

export async function listPaymentHistory(token, params = {}) {
  const apiParams = {
    search: params.search || undefined,
    payment_mode: filterModeParam(params.modeFilter),
    page: params.page,
    limit: params.limit,
  };

  return getPaymentHistory(token, apiParams).then(mapPaymentHistoryFromApi);
}

export async function collectBillPayment(visitId, payment, token) {
  return collectPayment(visitId, uiToApiPayment(payment), token);
}

export async function fetchBillPreview(
  { registrationFee, consultationFee, gstPercent, registerBody },
  token
) {
  try {
    const raw = registerBody
      ? await previewBillForRegister(registerBody, token)
      : await previewBillFees(
          {
            registration_fee: registrationFee,
            consultation_fee: consultationFee,
            gst_percent: gstPercent,
          },
          token
        );
    return apiToUiBillPreview(raw);
  } catch {
    return null;
  }
}

export async function removeBill(visitId, token) {
  if (visitId == null || visitId === '') {
    return Promise.reject(new Error('Visit id is required to delete a bill'));
  }
  return deleteBill(visitId, token);
}
