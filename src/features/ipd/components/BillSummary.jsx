/**
 * Bill summary totals — empty-safe until API provides amounts.
 */

export default function BillSummary({
  subtotal = null,
  tax = null,
  total = null,
  paid = null,
  balance = null,
}) {
  const fmt = (v) => (v == null || v === '' ? '—' : v);

  return (
    <div className="ipd-totals">
      <div className="ipd-totals__row">
        <span>Subtotal</span>
        <span>{fmt(subtotal)}</span>
      </div>
      <div className="ipd-totals__row">
        <span>Tax</span>
        <span>{fmt(tax)}</span>
      </div>
      <div className="ipd-totals__row ipd-totals__row--grand">
        <span>Total</span>
        <span>{fmt(total)}</span>
      </div>
      {paid != null || balance != null ? (
        <>
          <div className="ipd-totals__row">
            <span>Paid</span>
            <span>{fmt(paid)}</span>
          </div>
          <div className="ipd-totals__row">
            <span>Balance</span>
            <span>{fmt(balance)}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
