import { formatCurrency } from '@/shared/utils/formatCurrency';

export default function OpdBillItemsRecap({ items, subtotal, tax, grandTotal, gstPercent = 5 }) {
  const validItems = items.filter((row) => row.name && Number(row.unitPrice) > 0);
  if (!validItems.length) return null;

  return (
    <div className="opd-bill-recap">
      <h4 className="opd-bill-recap__title">Bill items</h4>
      <ul className="opd-bill-recap__list">
        {validItems.map((row) => (
          <li key={row.id} className="opd-bill-recap__item">
            <span className="opd-bill-recap__name">
              {row.name}
              {Number(row.qty) > 1 ? ` × ${row.qty}` : ''}
            </span>
            <span className="opd-bill-recap__amt">
              {formatCurrency(Number(row.qty) * Number(row.unitPrice))}
            </span>
          </li>
        ))}
      </ul>
      <div className="opd-bill-recap__totals">
        <div className="opd-bill-recap__total-row">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="opd-bill-recap__total-row">
          <span>Tax ({Number.isFinite(Number(gstPercent)) ? Number(gstPercent) : 5}%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="opd-bill-recap__total-row opd-bill-recap__total-row--grand">
          <span>Grand Total</span>
          <strong>{formatCurrency(grandTotal)}</strong>
        </div>
      </div>
    </div>
  );
}
