/**
 * Flatten bill payments into individual payment records for Payment History filtering.
 * Preserves partial payment visualization per transaction.
 */
export function flattenPaymentRecords(bills) {
  const records = [];
  bills.forEach((bill) => {
    if (bill.payments?.length) {
      bill.payments.forEach((p, idx) => {
        records.push({
          id: `${bill.id}-pay-${idx}`,
          billId: bill.id,
          patientId: bill.patientId,
          patientName: bill.patientName,
          mode: p.mode,
          amount: p.amount,
          ref: p.ref || '—',
          date: p.date,
          billStatus: bill.status,
          billTotal: bill.total,
          billPaid: bill.paid,
          billBalance: bill.balance,
        });
      });
    } else if (bill.paid > 0) {
      records.push({
        id: `${bill.id}-pay-0`,
        billId: bill.id,
        patientId: bill.patientId,
        patientName: bill.patientName,
        mode: bill.paymentMode || 'Cash',
        amount: bill.paid,
        ref: '—',
        date: bill.date,
        billStatus: bill.status,
        billTotal: bill.total,
        billPaid: bill.paid,
        billBalance: bill.balance,
      });
    }
  });
  return records.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function sumByMode(records, mode) {
  if (mode === 'all') return records.reduce((s, r) => s + r.amount, 0);
  if (mode === 'UPI') {
    return records
      .filter((r) => r.mode === 'UPI' || r.mode === 'Online')
      .reduce((s, r) => s + r.amount, 0);
  }
  return records.filter((r) => r.mode === mode).reduce((s, r) => s + r.amount, 0);
}
