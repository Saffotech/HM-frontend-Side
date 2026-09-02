import { Fragment, useMemo } from 'react';
import { BedDouble, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import {
  buildSpecialBedDisplayRows,
  buildWardTariffDisplayRows,
  groupSpecialBedsForWardTable,
  hasBedTariffData,
} from '@/shared/utils/bedTariffDisplay';

function dayRate(amount) {
  if (amount == null) return '—';
  return `${formatCurrency(amount)} / day`;
}

function CustomRateCell({ charge, wardDefault }) {
  const differs =
    wardDefault != null && Number(charge) !== Number(wardDefault);

  return (
    <div className="pricing-bed-tariff__rate-cell">
      <span className="pricing-bed-tariff__rate-value">{dayRate(charge)}</span>
      {differs ? (
        <span className="pricing-bed-tariff__rate-compare">
          Ward default {dayRate(wardDefault)}
        </span>
      ) : null}
    </div>
  );
}

function CustomBedRow({ row, wardDefault, showWard = false }) {
  return (
    <tr key={row.key} className="pricing-table__row--custom-bed">
      <td className="pricing-table__name">
        <div className="pricing-bed-tariff__bed-cell">
          {!showWard ? (
            <span className="pricing-bed-tariff__bed-branch" aria-hidden="true">↳</span>
          ) : null}
          <span className="pricing-bed-tariff__bed-id">Bed {row.bed}</span>
          {showWard ? (
            <span className="pricing-bed-tariff__bed-ward">{row.ward}</span>
          ) : null}
          <span className="pricing-bed-tariff__custom-tag">Custom</span>
        </div>
      </td>
      <td className="pricing-table__amount">
        <CustomRateCell charge={row.charge} wardDefault={wardDefault?.single} />
      </td>
      <td className="pricing-table__amount">—</td>
    </tr>
  );
}

export default function BedTariffPanel({ bedTariff, inventoryWardNames }) {
  const wardDisplayOptions = useMemo(
    () => ({ inventoryWardNames }),
    [inventoryWardNames],
  );
  const wardRows = useMemo(
    () => buildWardTariffDisplayRows(bedTariff, wardDisplayOptions),
    [bedTariff, wardDisplayOptions],
  );
  const specialRows = useMemo(() => buildSpecialBedDisplayRows(bedTariff), [bedTariff]);
  const { byWard, unmatched } = useMemo(
    () => groupSpecialBedsForWardTable(wardRows, specialRows),
    [wardRows, specialRows],
  );

  if (!hasBedTariffData(bedTariff)) {
    return <p className="pricing-empty">No bed tariff configured.</p>;
  }

  const customCount = specialRows.length;

  return (
    <div className="pricing-bed-tariff">
      {customCount > 0 ? (
        <div className="pricing-bed-tariff__callout" role="status">
          <Sparkles className="pricing-bed-tariff__callout-icon" size={18} aria-hidden="true" />
          <div className="pricing-bed-tariff__callout-body">
            <strong>{customCount} custom bed price{customCount === 1 ? '' : 's'}</strong>
            <span>
              Specific beds override the ward rate. Look for rows marked{' '}
              <span className="pricing-bed-tariff__custom-tag pricing-bed-tariff__custom-tag--inline">
                Custom
              </span>{' '}
              under each ward.
            </span>
          </div>
        </div>
      ) : null}

      {wardRows.length > 0 ? (
        <section className="pricing-bed-tariff__section">
          <h3 className="pricing-bed-tariff__heading">
            <BedDouble size={18} aria-hidden="true" />
            Ward rates
          </h3>
          <div className="pricing-table-wrap">
            <table className="pricing-table pricing-table--bed-tariff">
              <thead>
                <tr>
                  <th className="pricing-table__name">Ward</th>
                  <th className="pricing-table__amount">Single bed</th>
                  <th className="pricing-table__amount">Double bed</th>
                </tr>
              </thead>
              <tbody>
                {wardRows.map((row) => {
                  const customs = byWard.get(row.ward) ?? [];
                  return (
                    <Fragment key={row.ward}>
                      <tr className="pricing-table__row--ward">
                        <td className="pricing-table__name">{row.ward}</td>
                        <td className="pricing-table__amount">{dayRate(row.single)}</td>
                        <td className="pricing-table__amount">{dayRate(row.double)}</td>
                      </tr>
                      {customs.map((custom) => (
                        <CustomBedRow key={custom.key} row={custom} wardDefault={row} />
                      ))}
                    </Fragment>
                  );
                })}
                {unmatched.map((row) => (
                  <CustomBedRow
                    key={row.key}
                    row={row}
                    wardDefault={null}
                    showWard
                  />
                ))}
              </tbody>
            </table>
          </div>

          {customCount === 0 ? (
            <div className="pricing-bed-tariff__empty-custom" role="status">
              <p className="pricing-bed-tariff__empty-custom-title">No custom bed prices</p>
            </div>
          ) : null}
        </section>
      ) : specialRows.length > 0 ? (
        <section className="pricing-bed-tariff__section">
          <h3 className="pricing-bed-tariff__heading">
            <BedDouble size={18} aria-hidden="true" />
            Custom bed prices
          </h3>
          <div className="pricing-table-wrap">
            <table className="pricing-table pricing-table--bed-tariff">
              <thead>
                <tr>
                  <th className="pricing-table__name">Bed</th>
                  <th className="pricing-table__department">Ward</th>
                  <th className="pricing-table__amount">Price</th>
                </tr>
              </thead>
              <tbody>
                {specialRows.map((row) => (
                  <tr key={row.key} className="pricing-table__row--custom-bed">
                    <td className="pricing-table__name">
                      <div className="pricing-bed-tariff__bed-cell">
                        <span className="pricing-bed-tariff__bed-id">Bed {row.bed}</span>
                        <span className="pricing-bed-tariff__custom-tag">Custom</span>
                      </div>
                    </td>
                    <td className="pricing-table__department">{row.ward}</td>
                    <td className="pricing-table__amount">{dayRate(row.charge)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
