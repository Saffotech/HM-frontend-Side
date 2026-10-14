export const CURRENCY = "INR";

const currencyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
const compactFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: CURRENCY, notation: "compact", maximumFractionDigits: 1 });

export function formatCurrency(amount) {
  return currencyFormat.format(Number(amount) || 0);
}

export function formatCompactCurrency(amount) {
  return compactFormat.format(Number(amount) || 0);
}

export function formatPercent(value) {
  const number = Number(value) || 0;
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(1)}%`;
}

export function percentChange(current, previous) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}
