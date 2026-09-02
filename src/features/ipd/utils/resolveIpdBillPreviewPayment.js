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

function sumPaidBilledTotal(bills = []) {
  return nonVoidBills(bills)
    .filter((bill) => String(bill.payment_status || '').toLowerCase() === 'paid')
    .reduce((sum, bill) => sum + Number(bill.grand_total ?? 0), 0);
}

/**
 * Prefer open / just-collected bill. Only treat charges as Paid when due is 0.
 * Collect payment is allowed only when balance (due) > 0.
 */
export function resolveIpdBillPreviewPayment({
  bills = [],
  lastBillResult = null,
  preview = null,
} = {}) {
  const openBill = bills.find(isOpenBill) ?? null;
  const activeBill = openBill ?? lastBillResult ?? null;
  const grandTotal = Number(preview?.grand_total ?? 0);
  const paidTowards = sumPaidAmount(
    lastBillResult && !bills.some((b) => b?.id === lastBillResult.id)
      ? [...bills, lastBillResult]
      : bills,
  );
  const billedPaidTotal = sumPaidBilledTotal(bills);

  if (activeBill && isOpenBill(activeBill)) {
    const paid = Number(activeBill.paid_amount ?? 0);
    const balance = Number(activeBill.balance_due ?? Math.max(0, grandTotal - paid));
    const status = String(activeBill.payment_status || statusFromAmounts(paid, balance)).toLowerCase();
    return {
      openBill: activeBill,
      billForSummary: activeBill,
      printableBill: activeBill,
      paymentStatusKey: status === 'paid' || status === 'partial' ? status : 'pending',
      paid,
      balance,
      isFullyPaid: balance <= 0.01,
      canCollectPayment: balance > 0.01,
    };
  }

  if (activeBill && String(activeBill.payment_status || '').toLowerCase() === 'paid') {
    const paid = Number(activeBill.paid_amount ?? activeBill.grand_total ?? 0);
    const accruedDue = Math.max(0, grandTotal - Math.max(billedPaidTotal, Number(activeBill.grand_total ?? 0)));
    if (accruedDue <= 0.01) {
      return {
        openBill: null,
        billForSummary: activeBill,
        printableBill: activeBill,
        paymentStatusKey: 'paid',
        paid: grandTotal,
        balance: 0,
        isFullyPaid: true,
        canCollectPayment: false,
      };
    }
  }

  const accruedDue = Math.max(0, grandTotal - billedPaidTotal);
  if (billedPaidTotal > 0.01 && accruedDue <= 0.01) {
    const latestPaid = [...nonVoidBills(bills)]
      .filter((bill) => String(bill.payment_status || '').toLowerCase() === 'paid')
      .sort((a, b) => Number(b?.id ?? 0) - Number(a?.id ?? 0))[0] ?? null;
    return {
      openBill: null,
      billForSummary: latestPaid,
      printableBill: latestPaid,
      paymentStatusKey: 'paid',
      paid: grandTotal,
      balance: 0,
      isFullyPaid: true,
      canCollectPayment: false,
    };
  }

  if (accruedDue > 0.01 && billedPaidTotal > 0.01) {
    const paidApplied = Math.min(paidTowards, grandTotal);
    return {
      openBill: null,
      billForSummary: null,
      printableBill: null,
      paymentStatusKey: statusFromAmounts(paidApplied, accruedDue),
      paid: paidApplied,
      balance: accruedDue,
      isFullyPaid: false,
      canCollectPayment: true,
    };
  }

  return {
    openBill: null,
    billForSummary: null,
    printableBill: null,
    paymentStatusKey: 'pending',
    paid: 0,
    balance: grandTotal,
    isFullyPaid: grandTotal <= 0.01,
    canCollectPayment: grandTotal > 0.01,
  };
}
