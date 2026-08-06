/**
 * Bill summary totals — empty-safe until API provides amounts.
 * Default: horizontal strip (Subtotal | Tax | Total).
 */

export default function BillSummary({
  subtotal = null,
  tax = null,
  total = null,
  paid = null,
  balance = null,
}) {
  const fmt = (v) => (v == null || v === '' ? '—' : v);
  const showExtra = paid != null || balance != null;

  return (
    <div className={`ipd-totals${showExtra ? ' ipd-totals--with-extra' : ''}`}>
      <div className="ipd-totals__cell">
        <span className="ipd-totals__label">Subtotal</span>
        <span className="ipd-totals__value">{fmt(subtotal)}</span>
      </div>
      <div className="ipd-totals__cell">
        <span className="ipd-totals__label">Tax</span>
        <span className="ipd-totals__value">{fmt(tax)}</span>
      </div>
      <div className="ipd-totals__cell ipd-totals__cell--grand">
        <span className="ipd-totals__label">Total</span>
        <span className="ipd-totals__value">{fmt(total)}</span>
      </div>
      {paid != null ? (
        <div className="ipd-totals__cell">
          <span className="ipd-totals__label">Paid</span>
          <span className="ipd-totals__value">{fmt(paid)}</span>
        </div>
      ) : null}
      {balance != null ? (
        <div className="ipd-totals__cell">
          <span className="ipd-totals__label">Balance</span>
          <span className="ipd-totals__value">{fmt(balance)}</span>
        </div>
      ) : null}
    </div>
  );
}
