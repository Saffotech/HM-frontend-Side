/**
 * Single source of truth for monetary display across the frontend.
 *
 * Change currency / locale / compact rules here only.
 */

// const LOCALE = 'en-IN';
// const CURRENCY_SYMBOL = '₹';

const LOCALE = 'en-US';
const CURRENCY_SYMBOL = '$';

const USE_INDIAN_COMPACT = CURRENCY_SYMBOL === '₹';

/** Symbol for labels, input prefixes, and table headers. */
export function getCurrencySymbol() {
  return CURRENCY_SYMBOL;
}

/** e.g. "Amount ($)" or "Registration fee (₹)" */
export function currencyAmountLabel(label) {
  return `${label} (${CURRENCY_SYMBOL})`;
}

/** e.g. "$ / day" or "₹ / day" */
export function currencyPerDayLabel() {
  return `${CURRENCY_SYMBOL} / day`;
}

/**
 * Locale-grouped digits without the currency symbol (for inputs beside a prefix).
 */
export function formatMoneyDigits(amount, options = {}) {
  const { maximumFractionDigits = 2, minimumFractionDigits = 0 } = options;
  if (amount == null || amount === '') return '';
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return n.toLocaleString(LOCALE, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

/**
 * Format a monetary amount for display.
 *
 * @param {unknown} amount
 * @param {{ empty?: string }} [options]
 *   When `empty` is set, null / undefined / '' / non-finite values return that
 *   string (e.g. '—' or 'N/A') instead of formatting as zero.
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
  if (Math.abs(x) >= 1e6) return formatPower10(x);
  const maximumFractionDigits = x >= 100 ? 0 : x >= 10 ? 1 : 2;
  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
    useGrouping: true,
  }).format(x);
  return trimTrailingZeros(formatted);
}

/** Amounts below this use full digits; from this threshold use compact K / M / etc. */
export const COMPACT_CURRENCY_FROM = 10000;

/**
 * Compact currency for stat cards and print (K / L / Cr for INR; K / M / B for others).
 */
export function formatCurrencyCompact(amount) {
  const n = Math.abs(Number(amount) || 0);
  const prefix = Number(amount) < 0 ? '-' : '';

  if (USE_INDIAN_COMPACT) {
    if (n >= 1e7) {
      const cr = n / 1e7;
      return `${prefix}${CURRENCY_SYMBOL}${formatScaledNumber(cr)} Cr`;
    }
    if (n >= 1e5) {
      const lakh = n / 1e5;
      return `${prefix}${CURRENCY_SYMBOL}${formatScaledNumber(lakh)} L`;
    }
  } else {
    if (n >= 1e9) {
      const b = n / 1e9;
      return `${prefix}${CURRENCY_SYMBOL}${formatScaledNumber(b)} B`;
    }
    if (n >= 1e6) {
      const m = n / 1e6;
      return `${prefix}${CURRENCY_SYMBOL}${formatScaledNumber(m)} M`;
    }
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
