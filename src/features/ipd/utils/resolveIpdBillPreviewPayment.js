/** Resolve IPD bill preview payment status + amounts from one source of truth. */

function isOpenBill(bill) {
  if (!bill || bill.status === 'void') return false;
  const balance = Number(bill.balance_due ?? 0);
  const status = String(bill.payment_status || '').toLowerCase();
  if (balance > 0.01 && status !== 'paid') return true;
  return ['pending', 'partial'].includes(status);
}

/** Unpaid bill row from admission detail — use before generating a new bill. */
export function findOpenUnpaidBill(bills = []) {
  return (bills ?? []).find(isOpenBill) ?? null;
}

function nonVoidBills(bills = []) {
  return (bills ?? []).filter((bill) => bill?.status !== 'void');
}

function statusFromAmounts(paid, balance) {
  if (balance <= 0.01 && paid > 0.01) return 'paid';
  if (paid > 0.01) return 'partial';
  return 'pending';
}

function sumPaidAmount(bills = []) {
  return nonVoidBills(bills).reduce(
    (sum, bill) => sum + Number(bill.paid_amount ?? 0),
    0,
  );
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

/**
 * Prefer open / just-collected bill. Only treat charges as Paid when due is 0.
 * Collect payment is allowed only when balance (due) > 0.
 */
export function resolveIpdBillPreviewPayment({
  bills = [],
  lastBillResult = null,
  preview = null,
  grandTotal: grandTotalOverride = null,
} = {}) {
  const billRows = [...(bills ?? [])];
  if (lastBillResult?.id != null) {
    const existingIndex = billRows.findIndex(
      (bill) => bill?.id === lastBillResult.id,
    );
    if (existingIndex >= 0) billRows[existingIndex] = lastBillResult;
    else billRows.push(lastBillResult);
  }
  const openBill = billRows.find(isOpenBill) ?? null;
  const latestPaid = [...nonVoidBills(billRows)]
    .filter((bill) => String(bill.payment_status || '').toLowerCase() === 'paid')
    .sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0))[0] ?? null;
  const summaryBill = openBill ?? lastBillResult ?? latestPaid ?? null;
  const grandTotal = roundMoney(
    grandTotalOverride ?? preview?.grand_total ?? 0,
  );
  const paidTowards = roundMoney(sumPaidAmount(billRows));
  const paid = Math.min(Math.max(paidTowards, 0), Math.max(grandTotal, 0));
  const balance = roundMoney(Math.max(0, grandTotal - paid));
  const status = statusFromAmounts(paid, balance);

  return {
    openBill,
    billForSummary: summaryBill,
    printableBill: summaryBill,
    paymentStatusKey: status === 'paid' || status === 'partial' ? status : 'pending',
    paid,
    balance,
    isFullyPaid: balance <= 0.01,
    canCollectPayment: balance > 0.01,
  };
}
