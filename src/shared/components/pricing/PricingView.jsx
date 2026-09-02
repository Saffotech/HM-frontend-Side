import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  IndianRupee,
  Percent,
  UserRound,
  Search,
} from 'lucide-react';
import { getOpdBillingSettings } from '@/features/opd/api/opdSettings';
import { getDepartments, getDoctorsByDepartment } from '@/features/opd/api/reference';
import { getIpdPricing } from '@/features/ipd/api/pricing';
import {
  mapBillItemsToLabRows,
  mapCatalogTestsToLabRows,
} from '@/features/ipd/utils/ipdPricingLabRows';
import { getIpdDepartments, getIpdDoctorsByDepartment } from '@/features/ipd/api/reference';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import {
  DOUBLE_WARD_PREFIX,
  isDoubleWardStorageKey,
} from '@/features/admin/utils/bedTariffRates';
import { getLabCatalog } from '@/features/doctor/api/labCatalog';
import { mapLabCatalogList } from '@/shared/api/mappers/labCatalogMapper';
import {
  LAB_DEPT_CODE,
  departmentCode,
  filterClinicalDepartments,
  isLabOrRadDepartment,
} from '@/shared/utils/labDepartments';
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

function matchesLabDeptFilter(departmentName, filter) {
  if (!filter || filter === 'all') return true;
  const code = departmentCode(departmentName);
  if (filter === 'laboratory') return code === LAB_DEPT_CODE.LAB;
  if (filter === 'radiology') return code === LAB_DEPT_CODE.RAD;
  return true;
}

function flattenDoctorsByDepartment(departments, doctorLists) {
  return departments.flatMap((dept, index) =>
    (doctorLists[index] ?? []).map((doc) => ({
      ...doc,
      department_name: dept.name,
      department_code: dept.code,
      department_id: dept.id,
    })),
  );
}

function LabChargesPanel({ rows, labChargeSource, catalogAccessDenied }) {
  const [search, setSearch] = useState('');
  const [labFilter, setLabFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesLabDeptFilter(row.departmentName, labFilter)) return false;
      if (!q) return true;
      const hay = [row.name, row.departmentName, row.rowType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, labFilter]);

  return (
    <div className="pricing-table-shell">
      <div className="pricing-lab-filters">
        <label className="pricing-lab-filters__field">
          <span className="pricing-lab-filters__label">Department</span>
          <select
            className="pricing-lab-filters__select"
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
            aria-label="Filter by laboratory or radiology"
          >
            <option value="all">All</option>
            <option value="laboratory">Laboratory</option>
            <option value="radiology">Radiology</option>
          </select>
        </label>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search test or department..."
        />
      </div>
      <div className="pricing-table-wrap">
        <table className="pricing-table">
          <thead>
            <tr>
              <th className="pricing-table__name">Test</th>
              <th className="pricing-table__department">Department</th>
              <th className="pricing-table__amount">Price</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((row, idx) => (
                <tr key={`${row.key}-${idx}`}>
                  <td className="pricing-table__name">{row.name}</td>
                  <td className="pricing-table__department">
                    {row.departmentName || '—'}
                  </td>
                  <td className="pricing-table__amount">{formatCurrency(row.fee)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="pricing-table__empty">
                  {search || labFilter !== 'all'
                    ? 'No matching lab charges'
                    : rows.length === 0 && catalogAccessDenied
                      ? 'Lab catalog not available for IPD. Ask admin to grant lab_catalog:view to the IPD role.'
                      : labChargeSource === 'bill_items'
                        ? 'No lab-related bill items configured in OPD pricing settings.'
                        : 'No lab tests configured in Admin → Lab catalog.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

export default function PricingView({
  title,
  subtitle,
  tabs,
  data: externalData,
  showSummary = true,
  dataSource = 'opd',
  clinicalConsultFeesOnly = false,
}) {
  const token = useQueryToken();
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
      if (dataSource === 'ipd') {
        const [pricingRes, departments] = await Promise.all([
          getIpdPricing(token),
          getIpdDepartments(token),
        ]);

        const doctorResults = await Promise.all(
          departments.map((d) =>
            getIpdDoctorsByDepartment(d.id, token).catch(() => []),
          ),
        );
        const doctors = flattenDoctorsByDepartment(departments, doctorResults);

        let labCatalogTests = [];
        let labCatalogAccessDenied = false;
        try {
          labCatalogTests = mapLabCatalogList(
            await getLabCatalog(token, { active: true }),
          );
        } catch {
          labCatalogAccessDenied = true;
          labCatalogTests = [];
        }

        setData({
          settings: { pricing: pricingRes?.pricing },
          departments,
          doctors,
          labCatalogTests,
          labCatalogAccessDenied,
        });
        return;
      }

      const [settingsRes, departments] = await Promise.all([
        getOpdBillingSettings(),
        getDepartments(),
      ]);

      const doctorResults = await Promise.all(
        departments.map((d) =>
          getDoctorsByDepartment(d.id).catch(() => ({ doctors: [] })),
        ),
      );
      const doctors = flattenDoctorsByDepartment(
        departments,
        doctorResults.map((r) => r?.doctors ?? []),
      );

      setData({
        settings: settingsRes,
        departments,
        doctors,
        labCatalogTests: [],
        labCatalogAccessDenied: false,
      });
    } catch (err) {
      setIsError(true);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [externalData, dataSource, token]);

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

  const clinicalDepartments = useMemo(
    () =>
      clinicalConsultFeesOnly
        ? filterClinicalDepartments(data?.departments ?? [])
        : (data?.departments ?? []),
    [data, clinicalConsultFeesOnly],
  );

  const departmentRows = useMemo(
    () =>
      clinicalDepartments.map((d) => ({
        key: d.id,
        name: d.name,
        fee: deptOverride.has(d.id) ? deptOverride.get(d.id) : defaultConsultationFee,
      })),
    [clinicalDepartments, deptOverride, defaultConsultationFee],
  );

  const doctorRows = useMemo(() => {
    const labDeptIds = new Set(
      (data?.departments ?? [])
        .filter((d) => isLabOrRadDepartment(d))
        .map((d) => String(d.id)),
    );

    return (data?.doctors ?? [])
      .filter((doc) => String(doc.name || '').trim())
      .filter((doc) => {
        if (!clinicalConsultFeesOnly) return true;
        if (isLabOrRadDepartment({
          name: doc.department_name,
          code: doc.department_code,
        })) {
          return false;
        }
        if (doc.department_id != null && labDeptIds.has(String(doc.department_id))) {
          return false;
        }
        return true;
      })
      .map((doc) => ({
        key: doc.id,
        name: doc.name,
        departmentName: doc.department_name,
        fee: Number(doc.consultation_fee ?? doc.fee ?? defaultConsultationFee),
      }));
  }, [data, clinicalConsultFeesOnly, defaultConsultationFee]);

  const labChargeRows = useMemo(() => {
    const catalogRows = mapCatalogTestsToLabRows(
      data?.labCatalogTests ?? [],
      data?.departments ?? [],
    );
    if (catalogRows.length) return catalogRows;
    return mapBillItemsToLabRows(pricing?.bill_items ?? []);
  }, [data, pricing]);

  const labChargeSource = useMemo(() => {
    const catalogRows = mapCatalogTestsToLabRows(
      data?.labCatalogTests ?? [],
      data?.departments ?? [],
    );
    if (catalogRows.length) return 'catalog';
    const billRows = mapBillItemsToLabRows(pricing?.bill_items ?? []);
    if (billRows.length) return 'bill_items';
    return 'none';
  }, [data, pricing]);

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
          {showSummary ? (
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
          ) : null}

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

            {activeTab === 'lab' && (
              <LabChargesPanel
                rows={labChargeRows}
                labChargeSource={labChargeSource}
                catalogAccessDenied={data?.labCatalogAccessDenied}
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
