/**
 * Single source of truth for monetary display across the frontend.
 *
 * Change currency / locale / compact rules here only.
 */

// const LOCALE = 'en-IN';
// const CURRENCY_SYMBOL = '₹';

const LOCALE = 'en-US';
const CURRENCY_SYMBOL = '$';
/**
 * Format a monetary amount for display.
 *
 * @param {unknown} amount
 * @param {{ empty?: string }} [options]
 *   When `empty` is set, null / undefined / '' / non-finite values return that
 *   string (e.g. '—' or 'N/A') instead of formatting as zero.
 *
 * Examples (INR):
 *   1500     -> ₹1,500
 *   1500.5   -> ₹1,500.5
 *   null     -> ₹0          (default)
 *   null, { empty: '—' } -> —
 */
export function formatCurrency(amount, options = {}) {
  const { empty } = options;
  const isBlank = amount == null || amount === '';

  if (isBlank) {
    if (empty !== undefined) return empty;
  }

  const value = Number(isBlank ? 0 : amount);
  if (!Number.isFinite(value)) {
    if (empty !== undefined) return empty;
    return `${CURRENCY_SYMBOL}0`;
  }

  return `${CURRENCY_SYMBOL}${value.toLocaleString(LOCALE, {
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
  const formatted = new Intl.NumberFormat(LOCALE, {
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
    return `${prefix}${CURRENCY_SYMBOL}${formatScaledNumber(cr)} Cr`;
  }
  if (n >= 1e5) {
    const lakh = n / 1e5;
    return `${prefix}${CURRENCY_SYMBOL}${formatScaledNumber(lakh)} L`;
  }
  if (n >= COMPACT_CURRENCY_FROM) {
    const k = n / 1e3;
    return `${prefix}${CURRENCY_SYMBOL}${formatScaledNumber(k)} K`;
  }
  return formatCurrency(amount);
}

export function shouldUseCompactCurrency(amount) {
  return formatCurrencyCompact(amount) !== formatCurrency(amount);
}
