import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  IndianRupee,
  Percent,
  UserRound,
  Search,
} from 'lucide-react';
import { getOpdBillingSettings } from '@/features/opd/api/opdSettings';
import { getDepartments, getDoctorsByDepartment } from '@/features/opd/api/reference';
import {
  DOUBLE_WARD_PREFIX,
  isDoubleWardStorageKey,
} from '@/features/admin/utils/bedTariffRates';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { QueryFeedback, Tabs } from '@/shared/components/common';
import './PricingView.css';

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="pricing-summary-card">
      <div className="pricing-summary-card__icon">
        <Icon size={22} />
      </div>
      <div className="pricing-summary-card__body">
        <span className="pricing-summary-card__label">{label}</span>
        <span className="pricing-summary-card__value">{value}</span>
      </div>
    </div>
  );
}

function SearchField({ value, onChange, placeholder }) {
  return (
    <div className="pricing-search">
      <Search className="pricing-search__icon" size={18} />
      <input
        type="text"
        className="pricing-search__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="pricing-search__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}

function FeeTable({ rows, nameLabel, placeholder, showDepartment = false }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = String(r.name || '').toLowerCase();
      const dept = String(r.departmentName || '').toLowerCase();
      return name.includes(q) || dept.includes(q);
    });
  }, [rows, search]);

  const colSpan = showDepartment ? 3 : 2;

  return (
    <div className="pricing-table-shell">
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={placeholder || 'Search...'}
      />
      <div className="pricing-table-wrap">
        <table className="pricing-table">
          <thead>
            <tr>
              <th className="pricing-table__name">{nameLabel}</th>
              {showDepartment && (
                <th className="pricing-table__department">Department</th>
              )}
              <th className="pricing-table__amount">Price</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((row, idx) => (
                <tr key={`${row.key}-${idx}`}>
                  <td className="pricing-table__name">{row.name}</td>
                  {showDepartment && (
                    <td className="pricing-table__department">
                      {row.departmentName || '—'}
                    </td>
                  )}
                  <td className="pricing-table__amount">{formatCurrency(row.fee)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={colSpan} className="pricing-table__empty">
                  {search ? 'No matching results' : 'No items configured'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PricingView({ title, subtitle, tabs, data: externalData }) {
  const [data, setData] = useState(externalData || null);
  const [isLoading, setIsLoading] = useState(!externalData);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(tabs[0]?.id);

  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  useEffect(() => {
    if (!tabIds.includes(activeTab)) {
      setActiveTab(tabs[0]?.id);
    }
  }, [tabIds, activeTab, tabs]);

  const load = useCallback(async () => {
    if (externalData) return;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const [settingsRes, departments] = await Promise.all([
        getOpdBillingSettings(),
        getDepartments(),
      ]);

      const doctorResults = await Promise.all(
        departments.map((d) =>
          getDoctorsByDepartment(d.id).catch(() => ({ doctors: [] })),
        ),
      );
      const doctors = doctorResults.flatMap((r) => r?.doctors ?? []);

      setData({ settings: settingsRes, departments, doctors });
    } catch (err) {
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [externalData]);

  useEffect(() => {
    load();
  }, [load]);

  const pricing = data?.settings?.pricing;
  const defaultConsultationFee = Number(pricing?.consultation_fee ?? 0);

  const deptOverride = useMemo(
    () =>
      new Map(
        (pricing?.department_consultation_fees ?? []).map((d) => [
          d.department_id,
          Number(d.fee),
        ]),
      ),
    [pricing],
  );

  const departmentRows = useMemo(
    () =>
      (data?.departments ?? []).map((d) => ({
        key: d.id,
        name: d.name,
        fee: deptOverride.has(d.id) ? deptOverride.get(d.id) : defaultConsultationFee,
      })),
    [data, deptOverride, defaultConsultationFee],
  );

  const doctorRows = useMemo(
    () =>
      (data?.doctors ?? [])
        .filter((doc) => String(doc.name || '').trim())
        .map((doc) => ({
          key: doc.id,
          name: doc.name,
          departmentName: doc.department_name,
          fee: Number(doc.consultation_fee ?? defaultConsultationFee),
        })),
    [data, defaultConsultationFee],
  );

  const billItemRows = useMemo(
    () =>
      (pricing?.bill_items ?? [])
        .filter(
          (item) =>
            item?.is_active !== false &&
            String(item?.name || '').trim() &&
            String(item?.name || '').trim().toLowerCase() !== 'consultation',
        )
        .map((item) => ({ key: item.id, name: item.name, fee: item.price })),
    [pricing],
  );

  const bedTariff = pricing?.bed_tariff;
  const wardRates = (bedTariff?.ward_rates ?? []).filter(
    (row) => String(row?.ward_name || '').trim() && !isDoubleWardStorageKey(row.ward_name),
  );
  const doubleWardRates = (bedTariff?.ward_rates ?? []).filter(
    (row) => String(row?.ward_name || '').trim() && isDoubleWardStorageKey(row.ward_name),
  );
  const specialBedRates = (bedTariff?.special_bed_rates ?? []).filter(
    (row) => String(row?.bed_number || '').trim(),
  );
  const hasBedTariff =
    bedTariff &&
    (Number(bedTariff.general_ward_charge) > 0 ||
      Number(bedTariff.private_ward_charge) > 0 ||
      Number(bedTariff.icu_charge) > 0 ||
      wardRates.length > 0 ||
      doubleWardRates.length > 0 ||
      specialBedRates.length > 0);

  const showBed = tabIds.includes('bed');

  return (
    <div className="page-stack pricing-page">
      <div className="page-header">
        <h2 className="page-title">{title}</h2>
        <p className="pricing-page__subtitle">{subtitle}</p>
      </div>

      <QueryFeedback isLoading={isLoading} isError={isError} error={error} onRetry={load}>
        <div className="pricing-page__content">
          <div className="pricing-page__summary">
            <SummaryCard
              icon={IndianRupee}
              label="Registration Fee"
              value={formatCurrency(pricing?.registration_fee)}
            />
            <SummaryCard
              icon={UserRound}
              label="Consultation Fee"
              value={formatCurrency(defaultConsultationFee)}
            />
            <SummaryCard
              icon={Percent}
              label="GST"
              value={`${pricing?.gst_percent ?? 0}%`}
            />
          </div>

          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          <div className="pricing-tab-panel">
            {activeTab === 'department' && (
              <FeeTable
                rows={departmentRows}
                nameLabel="Department"
                placeholder="Search department..."
              />
            )}

            {activeTab === 'doctor' && (
              <FeeTable
                rows={doctorRows}
                nameLabel="Doctor"
                placeholder="Search doctor..."
                showDepartment
              />
            )}

            {activeTab === 'items' && (
              <FeeTable
                rows={billItemRows}
                nameLabel="Service"
                placeholder="Search service..."
              />
            )}

            {showBed &&
              activeTab === 'bed' &&
              (hasBedTariff ? (
                <div className="pricing-bed">
                  {Number(bedTariff.general_ward_charge) > 0 && (
                    <div className="pricing-bed__row">
                      <span>General Ward</span>
                      <span>{formatCurrency(bedTariff.general_ward_charge)} / day</span>
                    </div>
                  )}
                  {Number(bedTariff.private_ward_charge) > 0 && (
                    <div className="pricing-bed__row">
                      <span>Private Ward</span>
                      <span>{formatCurrency(bedTariff.private_ward_charge)} / day</span>
                    </div>
                  )}
                  {Number(bedTariff.icu_charge) > 0 && (
                    <div className="pricing-bed__row">
                      <span>ICU</span>
                      <span>{formatCurrency(bedTariff.icu_charge)} / day</span>
                    </div>
                  )}
                  {wardRates.length > 0 && (
                    <div className="pricing-bed__sub">
                      <h4 className="pricing-bed__sub-title">Ward Rates (Single)</h4>
                      {wardRates.map((row, idx) => (
                        <div className="pricing-bed__row" key={`ward-${idx}`}>
                          <span>{row.ward_name}</span>
                          <span>{formatCurrency(row.charge_per_day)} / day</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {doubleWardRates.length > 0 && (
                    <div className="pricing-bed__sub">
                      <h4 className="pricing-bed__sub-title">Ward Rates (Double)</h4>
                      {doubleWardRates.map((row, idx) => (
                        <div className="pricing-bed__row" key={`ward-dbl-${idx}`}>
                          <span>
                            {String(row.ward_name || '')
                              .replace(new RegExp(`^${DOUBLE_WARD_PREFIX}`, 'i'), '')
                              .trim() || row.ward_name}
                          </span>
                          <span>{formatCurrency(row.charge_per_day)} / day</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {specialBedRates.length > 0 && (
                    <div className="pricing-bed__sub">
                      <h4 className="pricing-bed__sub-title">Special Bed Rates</h4>
                      {specialBedRates.map((row, idx) => (
                        <div className="pricing-bed__row" key={`bed-${idx}`}>
                          <span>
                            {row.bed_number}
                            {row.ward_name ? ` · ${row.ward_name}` : ''}
                          </span>
                          <span>{formatCurrency(row.charge_per_day)} / day</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="pricing-empty">No bed tariff configured.</p>
              ))}
          </div>
        </div>
      </QueryFeedback>
    </div>
  );
}
