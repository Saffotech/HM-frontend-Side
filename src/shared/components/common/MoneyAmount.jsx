import {
  formatCurrency,
  formatCurrencyCompact,
  shouldUseCompactCurrency,
} from '@/shared/utils/formatCurrency';

/**
 * Smart currency display.
 * - Below compact threshold: full amount (e.g. $9,999).
 * - From threshold: compact K / M / B (or K / L / Cr for INR).
 *   Full amount is always accessible via tooltip (title).
 *   Full amount is always accessible via tooltip (title).
 * - compact prop: always use short form on screen when applicable.
 * - exact prop: always show full digits (for totals that must add up).
 * - printCompact prop: on print, render the short form (hides screen span, shows print span).
 */
export default function MoneyAmount({
  amount,
  className = '',
  strong = false,
  title,
  compact = false,
  exact = false,
  printCompact = false,
}) {
  const full = formatCurrency(amount);
  const short = formatCurrencyCompact(amount);

  const autoCompact = !exact && shouldUseCompactCurrency(amount);
  const screenText = exact ? full : compact || autoCompact ? short : full;
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
