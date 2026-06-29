export function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function trimTrailingZeros(numStr) {
  if (!numStr.includes('.')) return numStr;
  return numStr.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function formatPower10(x) {
  const n = Number(x);
  if (!Number.isFinite(n) || n === 0) return '0';
  const abs = Math.abs(n);
  const exp = Math.floor(Math.log10(abs));
  const mantissa = abs / 10 ** exp;
  const m = trimTrailingZeros(mantissa.toFixed(mantissa >= 10 ? 1 : 2));
  return `${m}×10^${exp}`;
}

function formatScaledNumber(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  // Avoid printing thousands of digits for absurdly large values.
  if (Math.abs(x) >= 1e6) return formatPower10(x);
  const maximumFractionDigits = x >= 100 ? 0 : x >= 10 ? 1 : 2;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
    useGrouping: true,
  }).format(x);
  return trimTrailingZeros(formatted);
}

/** Amounts below this use full digits (e.g. ₹9,999); from ₹10,000 use K / L / Cr. */
export const COMPACT_CURRENCY_FROM = 10000;

/**
 * Indian short form: K (thousands), L (lakhs), Cr (crores).
 * Use on stat cards and print where full digits would overflow.
 */
export function formatCurrencyCompact(amount) {
  const n = Math.abs(Number(amount) || 0);
  const prefix = Number(amount) < 0 ? '-' : '';

  if (n >= 1e7) {
    const cr = n / 1e7;
    return `${prefix}₹${formatScaledNumber(cr)} Cr`;
  }
  if (n >= 1e5) {
    const lakh = n / 1e5;
    return `${prefix}₹${formatScaledNumber(lakh)} L`;
  }
  if (n >= COMPACT_CURRENCY_FROM) {
    const k = n / 1e3;
    return `${prefix}₹${formatScaledNumber(k)} K`;
  }
  return formatCurrency(amount);
}

export function shouldUseCompactCurrency(amount) {
  return formatCurrencyCompact(amount) !== formatCurrency(amount);
}
