import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { DURATION, EASE_STANDARD } from '@/shared/motion';
import PricingFilterMenu from '@/shared/components/pricing/PricingFilterMenu';
import {
  buildSpecialBedDisplayRows,
  buildWardFilterOptions,
  buildWardTariffDisplayRows,
  findWardDefaultForSpecial,
  hasBedTariffData,
  specialBedMatchesWardFilter,
} from '@/shared/utils/bedTariffDisplay';

function dayRate(amount) {
  if (amount == null) return '—';
  return `${formatCurrency(amount)} / day`;
}

export default function BedTariffPanel({ bedTariff, inventoryWardNames }) {
  const [view, setView] = useState('ward');
  const [wardFilter, setWardFilter] = useState('all');
  const reduceMotion = useReducedMotion();

  const wardDisplayOptions = useMemo(
    () => ({ inventoryWardNames }),
    [inventoryWardNames],
  );
  const wardRows = useMemo(
    () => buildWardTariffDisplayRows(bedTariff, wardDisplayOptions),
    [bedTariff, wardDisplayOptions],
  );
  const specialRows = useMemo(() => buildSpecialBedDisplayRows(bedTariff), [bedTariff]);

  const wardFilterOptions = useMemo(
    () =>
      buildWardFilterOptions({
        inventoryWardNames,
        wardRows,
        specialRows,
      }),
    [inventoryWardNames, wardRows, specialRows],
  );

  const filteredSpecialRows = useMemo(
    () => specialRows.filter((row) => specialBedMatchesWardFilter(row, wardFilter)),
    [specialRows, wardFilter],
  );

  const showOptions = useMemo(() => {
    const options = [];
    if (wardRows.length > 0) {
      options.push({ value: 'ward', label: 'Ward rates' });
    }
    options.push({
      value: 'custom',
      label:
        specialRows.length > 0
          ? `Custom bed prices (${specialRows.length})`
          : 'Custom bed prices',
    });
    return options;
  }, [wardRows.length, specialRows.length]);

  const wardOptions = useMemo(
    () => [
      { value: 'all', label: 'All wards' },
      ...wardFilterOptions.map((name) => ({ value: name, label: name })),
    ],
    [wardFilterOptions],
  );

  if (!hasBedTariffData(bedTariff)) {
    return <p className="pricing-empty">No bed tariff configured.</p>;
  }

  const onlyCustom = wardRows.length === 0 && specialRows.length > 0;
  const activeView = onlyCustom ? 'custom' : view;

  return (
    <div className="pricing-bed-tariff">
      <div className="pricing-bed-tariff__filters">
        <PricingFilterMenu
          label="Show"
          value={activeView}
          options={showOptions}
          ariaLabel="Show ward rates or custom bed prices"
          onChange={(next) => {
            setView(next);
            setWardFilter('all');
          }}
        />
        <AnimatePresence>
          {activeView === 'custom' ? (
            <motion.div
              key="ward-filter"
              initial={reduceMotion ? false : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
              transition={{ duration: DURATION.fast, ease: EASE_STANDARD }}
            >
              <PricingFilterMenu
                label="Ward"
                value={wardFilter}
                options={wardOptions}
                ariaLabel="Filter custom prices by ward"
                onChange={setWardFilter}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'ward' ? (
          <motion.div
            key="ward-table"
            className="pricing-table-wrap"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: DURATION.fast, ease: EASE_STANDARD }}
          >
            <table className="pricing-table pricing-table--bed-tariff">
              <thead>
                <tr>
                  <th className="pricing-table__name">Ward</th>
                  <th className="pricing-table__amount">Single bed</th>
                  <th className="pricing-table__amount">Double bed</th>
                </tr>
              </thead>
              <tbody>
                {wardRows.map((row) => (
                  <tr key={row.ward}>
                    <td className="pricing-table__name">{row.ward}</td>
                    <td className="pricing-table__amount">{dayRate(row.single)}</td>
                    <td className="pricing-table__amount">{dayRate(row.double)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <motion.div
            key="custom-table"
            className="pricing-table-wrap"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: DURATION.fast, ease: EASE_STANDARD }}
          >
            <table className="pricing-table pricing-table--bed-tariff">
              <thead>
                <tr>
                  <th className="pricing-table__name">Bed</th>
                  <th className="pricing-table__department">Ward</th>
                  <th className="pricing-table__amount">Price</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpecialRows.length > 0 ? (
                  filteredSpecialRows.map((row) => {
                    const wardDefault = findWardDefaultForSpecial(wardRows, row);
                    const defaultCharge = wardDefault?.single ?? null;
                    const differs =
                      defaultCharge != null && Number(row.charge) !== Number(defaultCharge);
                    return (
                      <tr key={row.key}>
                        <td className="pricing-table__name">Bed {row.bed}</td>
                        <td className="pricing-table__department">{row.ward}</td>
                        <td className="pricing-table__amount">
                          <div className="pricing-bed-tariff__rate-cell">
                            <span>{dayRate(row.charge)}</span>
                            {differs ? (
                              <span className="pricing-bed-tariff__rate-compare">
                                Ward default {dayRate(defaultCharge)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="pricing-table__empty">
                      {specialRows.length === 0
                        ? 'No custom bed prices'
                        : 'No custom prices in this ward'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
