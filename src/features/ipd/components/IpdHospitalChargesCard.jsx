/**
 * Hospital charge heads — shared by insurance cashless and self / pay-and-claim billing.
 */

import { Fragment, useState } from 'react';
import { Button } from '@/shared/components/common';
import {
  calculateInsuranceChargeTotals,
  createCustomChargeHead,
  groupHospitalChargeBuckets,
  isDefaultChargeHead,
  isDiscountCharge,
  normalizeInsuranceChargeHeads,
  sortInsuranceChargeHeads,
} from '@/features/ipd/utils/insuranceChargeHeads';
import { toast } from '@/shared/utils/toast';
import { formatCurrency } from '@/shared/utils/formatCurrency';

export default function IpdHospitalChargesCard({
  charges,
  onChargesChange,
  onSave,
  saving = false,
  hint = '',
}) {
  const [focusHead, setFocusHead] = useState('room');
  const [newHeadLabel, setNewHeadLabel] = useState('');
  const [newHeadAmount, setNewHeadAmount] = useState('');

  const hospitalChargeBuckets = groupHospitalChargeBuckets(charges);
  const totals = calculateInsuranceChargeTotals(charges);

  const setAmount = (id, value) => {
    onChargesChange(
      charges.map((row) => (row.id === id ? { ...row, amount: value } : row)),
    );
  };

  const setLabel = (id, value) => {
    onChargesChange(
      charges.map((row) => (row.id === id ? { ...row, label: value } : row)),
    );
  };

  const removeCharge = (id) => {
    onChargesChange(charges.filter((row) => row.id !== id));
  };

  const addChargeHead = () => {
    const label = newHeadLabel.trim();
    if (!label) {
      toast.error('Enter a charge head name');
      return;
    }
    const amount = Number(newHeadAmount) || 0;
    onChargesChange(
      sortInsuranceChargeHeads([
        ...charges,
        createCustomChargeHead(label, amount),
      ]),
    );
    setNewHeadLabel('');
    setNewHeadAmount('');
    toast.success('Charge head added — save to keep changes');
  };

  return (
    <div className="ipd-card">
      <div className="ipd-card__head">
        <h2 className="ipd-card__title">Hospital Charges</h2>
        <Button type="button" size="sm" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Charges'}
        </Button>
      </div>
      <div className="ipd-card__body ipd-ins-charge-card">
        {hint ? <p className="ipd-ins-charge-card__hint">{hint}</p> : null}

        <div className="ipd-ins-charge-bucket">
          <table className="ipd-ins-charge-table">
            <thead>
              <tr>
                <th>Charge head</th>
                <th className="ipd-num">Amount (₹)</th>
                <th className="ipd-ins-charge-table__action" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {hospitalChargeBuckets.map((bucket) => (
                <Fragment key={bucket.id}>
                  <tr className="ipd-ins-charge-table__section">
                    <th colSpan={3} scope="rowgroup">
                      {bucket.label}
                    </th>
                  </tr>
                  {bucket.rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`ipd-ins-charge-table__row${
                        focusHead === row.id ? ' ipd-ins-charge-table__row--focus' : ''
                      }${isDiscountCharge(row) ? ' ipd-ins-charge-table__row--discount' : ''}`}
                    >
                      <td>
                        {isDefaultChargeHead(row) ? (
                          <span className="ipd-ins-charge-table__label">{row.label}</span>
                        ) : (
                          <input
                            className="ipd-input ipd-ins-charge-table__name-input"
                            value={row.label}
                            onFocus={() => setFocusHead(row.id)}
                            onChange={(e) => setLabel(row.id, e.target.value)}
                            aria-label="Charge head name"
                          />
                        )}
                      </td>
                      <td className="ipd-num">
                        <input
                          className="ipd-input ipd-ins-charge-input ipd-ins-charge-table__amount-input"
                          value={row.amount}
                          onFocus={() => setFocusHead(row.id)}
                          onChange={(e) =>
                            setAmount(row.id, e.target.value.replace(/[^\d.]/g, ''))
                          }
                          inputMode="decimal"
                          aria-label={`Amount for ${row.label}`}
                        />
                      </td>
                      <td className="ipd-ins-charge-table__action">
                        {!isDefaultChargeHead(row) ? (
                          <button
                            type="button"
                            className="ipd-text-link ipd-ins-charge-remove"
                            onClick={() => removeCharge(row.id)}
                          >
                            Remove
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="ipd-ins-charge-table__add-row">
                <td colSpan={3}>
                  <div className="ipd-ins-charge-table__add">
                    <input
                      className="ipd-input ipd-ins-charge-table__name-input"
                      value={newHeadLabel}
                      onChange={(e) => setNewHeadLabel(e.target.value)}
                      placeholder="New charge head"
                      aria-label="New charge head"
                    />
                    <input
                      className="ipd-input ipd-ins-charge-input ipd-ins-charge-table__amount-input"
                      value={newHeadAmount}
                      onChange={(e) =>
                        setNewHeadAmount(e.target.value.replace(/[^\d.]/g, ''))
                      }
                      placeholder="0"
                      inputMode="decimal"
                      aria-label="New charge amount"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addChargeHead}
                    >
                      + Add
                    </Button>
                  </div>
                </td>
              </tr>
              <tr className="ipd-ins-charge-table__total-row">
                <th scope="row">Gross bill</th>
                <td className="ipd-num">
                  <strong>{formatCurrency(totals.displayGross, { empty: '—' })}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export { calculateInsuranceChargeTotals, normalizeInsuranceChargeHeads, sortInsuranceChargeHeads };
