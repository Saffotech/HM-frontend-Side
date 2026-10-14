import { memo, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getDailyChargeItemPlaceholder } from '@/features/ipd/utils/insuranceDailyCharges';
import { formatCurrency, currencyAmountLabel } from '@/shared/utils/formatCurrency';

function formatChargeDate(iso) {
  if (!iso) return '—';
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isPharmacyItem(row) {
  return (
    row.charge_category === 'pharmacy' ||
    String(row.head ?? '').trim().toLowerCase() === 'pharmacy'
  );
}

/** Shallow row-reference equality — unchanged rows keep the same object ref after edits. */
function dailyChargeItemsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const DailyChargeRow = memo(function DailyChargeRow({
  row,
  chargeDate,
  updateDailyCharge,
  removeDailyCharge,
}) {
  return (
    <div className="ipd-ins-daily-detail-row">
      <input
        className="ipd-input"
        value={row.head}
        onChange={(e) => updateDailyCharge(row.id, { head: e.target.value })}
        placeholder="e.g. Pharmacy"
        aria-label={`Charge head for ${row.item_name}`}
      />
      <input
        className="ipd-input"
        value={row.item_name}
        onChange={(e) => updateDailyCharge(row.id, { item_name: e.target.value })}
        placeholder={getDailyChargeItemPlaceholder(row.head)}
        aria-label={`Item for ${formatChargeDate(chargeDate)}`}
      />
      <input
        className="ipd-input ipd-ins-daily-qty-input"
        value={row.quantity}
        onChange={(e) =>
          updateDailyCharge(row.id, {
            quantity: e.target.value.replace(/[^\d.]/g, ''),
          })
        }
        inputMode="decimal"
        aria-label={`Quantity for ${row.item_name}`}
      />
      <input
        className="ipd-input ipd-ins-charge-input"
        value={row.amount}
        onChange={(e) =>
          updateDailyCharge(row.id, {
            amount: e.target.value.replace(/[^\d.]/g, ''),
          })
        }
        inputMode="decimal"
        aria-label={`Amount for ${row.item_name}`}
      />
      <button
        type="button"
        className="ipd-text-link ipd-ins-charge-remove"
        onClick={() => removeDailyCharge(row.id)}
      >
        Remove
      </button>
    </div>
  );
}, (prev, next) =>
  prev.row === next.row &&
  prev.chargeDate === next.chargeDate &&
  prev.updateDailyCharge === next.updateDailyCharge &&
  prev.removeDailyCharge === next.removeDailyCharge,
);

const PharmacyChargeRow = memo(function PharmacyChargeRow({
  row,
  chargeDate,
  updateDailyCharge,
  removeDailyCharge,
}) {
  return (
    <div className="ipd-ins-daily-pharmacy-card__row">
      <input
        className="ipd-input"
        value={row.item_name}
        onChange={(e) =>
          updateDailyCharge(row.id, { item_name: e.target.value })
        }
        placeholder="Medicine name"
        aria-label={`Item for ${formatChargeDate(chargeDate)}`}
      />
      <input
        className="ipd-input ipd-ins-daily-qty-input"
        value={row.quantity}
        onChange={(e) =>
          updateDailyCharge(row.id, {
            quantity: e.target.value.replace(/[^\d.]/g, ''),
          })
        }
        inputMode="decimal"
        aria-label={`Quantity for ${row.item_name}`}
      />
      <input
        className="ipd-input ipd-ins-charge-input"
        value={row.amount}
        onChange={(e) =>
          updateDailyCharge(row.id, {
            amount: e.target.value.replace(/[^\d.]/g, ''),
          })
        }
        inputMode="decimal"
        aria-label={`Amount for ${row.item_name}`}
      />
      <button
        type="button"
        className="ipd-text-link ipd-ins-charge-remove"
        onClick={() => removeDailyCharge(row.id)}
      >
        Remove
      </button>
    </div>
  );
}, (prev, next) =>
  prev.row === next.row &&
  prev.chargeDate === next.chargeDate &&
  prev.updateDailyCharge === next.updateDailyCharge &&
  prev.removeDailyCharge === next.removeDailyCharge,
);

function IpdDailyChargesGroupItems({
  items,
  chargeDate,
  updateDailyCharge,
  removeDailyCharge,
}) {
  const [showPharmacy, setShowPharmacy] = useState(false);

  const { pharmacyItems, otherItems } = useMemo(() => {
    const pharmacy = [];
    const other = [];
    items.forEach((item) => {
      if (isPharmacyItem(item)) {
        pharmacy.push(item);
      } else {
        other.push(item);
      }
    });
    return { pharmacyItems: pharmacy, otherItems: other };
  }, [items]);

  const pharmacyTotalQty = useMemo(
    () => pharmacyItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [pharmacyItems],
  );

  const pharmacyTotalAmount = useMemo(
    () => pharmacyItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [pharmacyItems],
  );

  return (
    <>
      <div className="ipd-ins-daily-detail-head">
        <span>Head</span>
        <span>Item / medicine / treatment</span>
        <span>Qty</span>
        <span>{currencyAmountLabel('Amount')}</span>
        <span aria-hidden />
      </div>

      {otherItems.map((row) => (
        <DailyChargeRow
          key={row.id}
          row={row}
          chargeDate={chargeDate}
          updateDailyCharge={updateDailyCharge}
          removeDailyCharge={removeDailyCharge}
        />
      ))}

      {pharmacyItems.length === 1 && (
        <DailyChargeRow
          row={pharmacyItems[0]}
          chargeDate={chargeDate}
          updateDailyCharge={updateDailyCharge}
          removeDailyCharge={removeDailyCharge}
        />
      )}

      {pharmacyItems.length > 1 && (
        <>
          <div className="ipd-ins-daily-detail-row ipd-ins-daily-detail-row--pharmacy-summary">
            <input
              className="ipd-input"
              value="Pharmacy"
              readOnly
              tabIndex={-1}
              aria-label="Charge head"
            />
            <div className="ipd-ins-daily-pharmacy-trigger">
              <input
                className="ipd-input"
                value="View Medicine"
                readOnly
                tabIndex={-1}
                aria-label="View medicine"
                onClick={() => setShowPharmacy((v) => !v)}
                role="button"
              />
              <button
                type="button"
                className="ipd-ins-daily-pharmacy-chev-btn"
                onClick={() => setShowPharmacy((v) => !v)}
                aria-expanded={showPharmacy}
                aria-label={showPharmacy ? 'Hide medicine' : 'View medicine'}
              >
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={`ipd-ins-daily-pharmacy-chev${
                    showPharmacy ? ' ipd-ins-daily-pharmacy-chev--open' : ''
                  }`}
                />
              </button>
            </div>
            <input
              className="ipd-input ipd-ins-daily-qty-input"
              value={pharmacyTotalQty}
              readOnly
              tabIndex={-1}
              aria-label="Total pharmacy quantity"
            />
            <input
              className="ipd-input ipd-ins-charge-input"
              value={formatCurrency(pharmacyTotalAmount, { empty: '—' })}
              readOnly
              tabIndex={-1}
              aria-label="Total pharmacy amount"
            />
            <span aria-hidden />
          </div>

          {showPharmacy ? (
            <div className="ipd-ins-daily-pharmacy-card">
              <div className="ipd-ins-daily-pharmacy-card__head">
                <span>Medicine</span>
                <span>Qty</span>
                <span>{currencyAmountLabel('Amount')}</span>
                <span aria-hidden />
              </div>
              {pharmacyItems.map((row) => (
                <PharmacyChargeRow
                  key={row.id}
                  row={row}
                  chargeDate={chargeDate}
                  updateDailyCharge={updateDailyCharge}
                  removeDailyCharge={removeDailyCharge}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

export default memo(IpdDailyChargesGroupItems, (prev, next) => {
  if (prev.chargeDate !== next.chargeDate) return false;
  if (prev.updateDailyCharge !== next.updateDailyCharge) return false;
  if (prev.removeDailyCharge !== next.removeDailyCharge) return false;
  return dailyChargeItemsEqual(prev.items, next.items);
});
