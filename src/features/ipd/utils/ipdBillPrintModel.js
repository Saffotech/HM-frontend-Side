/** Build a provisional IPD invoice for print before a bill is generated. */

function formatBillDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function gstLabelFromPercent(gstPct) {
  const pct = Number(gstPct ?? 0);
  if (pct === Math.floor(pct)) {
    return `Tax (${pct}% GST)`;
  }
  return `Tax (${pct}% GST)`;
}

export function buildIpdProvisionalInvoice(preview, admissionDetail) {
  if (!preview) return null;

  const admission = admissionDetail?.admission ?? {};
  const gstPct = Number(preview.gst_percent ?? 0);
  const grandTotal = Number(preview.grand_total ?? 0);

  return {
    bill_number: 'Provisional',
    admission_no: preview.admission_no,
    bill_date: formatBillDate(),
    patient: {
      name: preview.patient_name || admission.patient_name || '—',
      patient_uid: admission.patient_uid || '—',
      phone: admission.patient_phone || null,
      address: admission.patient_address || null,
    },
    service: {
      department: admission.department_name || preview.ward_name || 'IPD',
      doctor: admission.doctor_name || '',
      ward: preview.ward_name,
      bed: preview.bed_number,
      admission_no: preview.admission_no,
    },
    bill_items: (preview.items ?? []).map((item) => ({
      description: item.description,
      qty: item.qty,
      unit_price: Number(item.unit_price ?? 0),
      amount: Number(item.amount ?? 0),
    })),
    payment_history: [],
    summary: {
      subtotal: Number(preview.subtotal ?? 0),
      gst_label: gstLabelFromPercent(gstPct),
      gst_amount: Number(preview.gst_amount ?? 0),
      grand_total: grandTotal,
      amount_paid: 0,
      balance_due: grandTotal,
      payment_status: 'pending',
    },
  };
}
