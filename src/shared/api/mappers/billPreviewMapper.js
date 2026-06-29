/** Map BillPreviewResponse → UI totals */

export function apiToUiBillPreview(raw) {
  if (!raw?.summary) return null;
  const summary = raw.summary;
  const items = (raw.bill_items ?? []).map((item) => ({
    name: item.description,
    qty: item.qty ?? 1,
    unitPrice: item.unit_price ?? item.unitPrice ?? item.amount,
    amount: item.amount,
  }));
  return {
    items,
    subtotal: Number(summary.subtotal ?? 0),
    tax: Number(summary.gst_amount ?? summary.tax ?? 0),
    total: Number(summary.grand_total ?? summary.total ?? 0),
    gstPercent: Number(summary.gst_percent ?? 5),
  };
}
