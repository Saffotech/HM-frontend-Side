import {
  formatCurrency,
  formatCurrencyCompact,
  shouldUseCompactCurrency,
} from '@/shared/utils/formatCurrency';

/**
 * Smart currency display.
 * - Below ₹10,000: full amount (e.g. ₹9,999).
 * - From ₹10,000: compact K / L / Cr (e.g. ₹10 K, ₹12 K, ₹10.2 K).
 *   Full amount is always accessible via tooltip (title).
 * - compact prop: always use short form on screen when applicable.
 * - printCompact prop: on print, render the short form (hides screen span, shows print span).
 */
export default function MoneyAmount({
  amount,
  className = '',
  strong = false,
  title,
  compact = false,
  printCompact = false,
}) {
  const full = formatCurrency(amount);
  const short = formatCurrencyCompact(amount);

  const autoCompact = shouldUseCompactCurrency(amount);
  const screenText = compact || autoCompact ? short : full;
  const needsDualSpan = printCompact && short !== full;

  const Tag = strong ? 'strong' : 'span';
  const base = `money-amount ${className}`.trim();

  if (needsDualSpan) {
    return (
      <>
        <Tag className={`${base} money-amount--screen`} title={title ?? full}>
          {screenText}
        </Tag>
        <Tag className={`${base} money-amount--print`} aria-label={full} title={full}>
          {short}
        </Tag>
      </>
    );
  }

  return (
    <Tag className={base} title={title ?? full}>
      {screenText}
    </Tag>
  );
}
