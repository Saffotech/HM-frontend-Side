export function createEmptyBillLineRow() {
  return { id: String(Date.now()), name: '', qty: 1, unitPrice: 0 };
}
