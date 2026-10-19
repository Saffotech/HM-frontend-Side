/**
 * Dispense form helpers. Persisted prices come from the pharmacy API, not browser storage.
 */

export function parseDispenseAmountInput(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function calculateUnitPriceFromLineAmount(amount, quantity) {
  const qty = Number(quantity) || 0;
  const lineAmount = Number(amount) || 0;
  if (qty <= 0 || lineAmount < 0) return 0;
  return Math.round((lineAmount / qty) * 100) / 100;
}

export function parseDispensePriceInput(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

export function calculateDispenseLineAmount(unitPrice, quantity) {
  const qty = Number(quantity) || 0;
  const rate = Number(unitPrice) || 0;
  if (qty <= 0 || rate < 0) return 0;
  return Math.round(rate * qty * 100) / 100;
}
