/**
 * IPD Pricing — read-only hospital rate card (bed tariffs, OPD reference fees).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  FlaskConical,
  Package,
  Search,
  Stethoscope,
  Tags,
  Wrench,
} from 'lucide-react';
import { EmptyState, Modal, QueryFeedback } from '@/shared/components/common';
import {
  useIpdBedsQuery,
  useIpdDepartmentsQuery,
  useIpdWardStatsQuery,
} from '@/features/ipd/hooks/useIpdQuery';
import { useIpdPricingSettingsQuery } from '@/features/ipd/hooks/useIpdPricingSettingsQuery';
import {
  buildBillItemRows,
  buildDoctorPricingSections,
  mergeDoctorPricingWithHospitalDepartments,
  buildOtherChargeRows,
  buildStayPackageRows,
  groupStayPackagesByWard,
  STAY_PACKAGE_DURATIONS,
  buildWardPricingRows,
  dedupeWardPricingRows,
  filterWardRowsByBedCategory,
  collectPricingWardNames,
  filterDoctorSections,
  filterSimpleRows,
  filterWardRows,
} from '@/features/ipd/utils/buildIpdPricingView';
import {
  DUMMY_WARD_NAMES,
  DUMMY_WARD_ROWS,
  getDummyPricingSettings,
} from '@/features/ipd/utils/dummyIpdPricing';

const CATEGORIES = [
  { id: 'wards', label: 'Wards & Rooms', icon: BedDouble },
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'doctors', label: 'Departments & Doctors', icon: Stethoscope },
  { id: 'diagnostics', label: 'Diagnostics', icon: FlaskConical },
  { id: 'procedures', label: 'Procedures', icon: Wrench },
  { id: 'other', label: 'Other Charges', icon: Tags },
];

function formatPrice(amount) {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function StatusBadge({ status }) {
  const active = String(status).toLowerCase() === 'active';
  return (
    <span
      className={`ipd-pricing__status${active ? ' ipd-pricing__status--active' : ''}`}
    >
      {status}
    </span>
  );
}

function PricingEmpty({ icon: Icon, title, description }) {
  return (
    <div className="ipd-pricing__empty">
      <EmptyState icon={Icon} title={title} description={description} />
    </div>
  );
}

const BED_TYPE_FILTERS = [
  { id: 'all', label: 'All beds' },
  { id: 'single', label: 'Single bed' },
  { id: 'double', label: 'Double bed' },
];

function SectionHead({ title, count, countLabel = 'rates', actions }) {
  return (
    <div className="ipd-pricing__section-head">
      <div className="ipd-pricing__section-head-main">
        <h2 className="ipd-pricing__section-title">{title}</h2>
        {actions ? <div className="ipd-pricing__section-actions">{actions}</div> : null}
      </div>
      {count != null ? (
        <span className="ipd-pricing__section-count">
          Showing {count} {count === 1 && countLabel.endsWith('s') ? countLabel.slice(0, -1) : countLabel}
        </span>
      ) : null}
    </div>
  );
}

function pickWithFallback(realRows, dummyRows) {
  return realRows.length > 0 ? realRows : dummyRows;
}

function BedTypeFilter({ value, onChange }) {
  return (
    <select
      className="ipd-input ipd-pricing__bed-filter"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filter by bed type"
    >
      {BED_TYPE_FILTERS.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function WardsSection({ rows, search }) {
  const [bedFilter, setBedFilter] = useState('all');

  const filtered = useMemo(() => {
    const bySearch = filterWardRows(rows, search);
    return filterWardRowsByBedCategory(bySearch, bedFilter);
  }, [rows, search, bedFilter]);

  const bedFilterControl = (
    <BedTypeFilter value={bedFilter} onChange={setBedFilter} />
  );

  if (rows.length === 0) {
    return (
      <PricingEmpty
        icon={BedDouble}
        title="No pricing configured"
        description="There are currently no configured ward or room rates."
      />
    );
  }

  if (filtered.length === 0) {
    return (
      <>
        <SectionHead
          title="Ward & room tariffs"
          count={0}
          actions={bedFilterControl}
        />
        <PricingEmpty
          icon={Search}
          title="No results found"
          description="Try a different search term."
        />
      </>
    );
  }

  return (
    <>
      <SectionHead
        title="Ward & room tariffs"
        count={filtered.length}
        actions={bedFilterControl}
      />
      <div className="ipd-table-wrap ipd-pricing__table-wrap">
        <table className="ipd-table ipd-table--dense ipd-pricing__table">
          <thead>
            <tr>
              <th>Ward / Room</th>
              <th>Type</th>
              <th className="ipd-num">Rate / Day</th>
              <th>Pricing basis</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                </td>
                <td>{row.type}</td>
                <td className="ipd-num ipd-num--strong">{formatPrice(row.rate)}</td>
                <td className="ipd-pricing__muted">{row.basis}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DepartmentFilter({ sections, value, onChange }) {
  return (
    <select
      className="ipd-input ipd-pricing__bed-filter ipd-pricing__dept-filter"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filter by department"
    >
      {sections.map((section) => (
        <option key={section.id} value={section.id}>
          {section.department}
        </option>
      ))}
    </select>
  );
}

function DoctorsSection({ sections, search }) {
  const filtered = useMemo(
    () => filterDoctorSections(sections, search),
    [sections, search],
  );

  const [selectedDeptId, setSelectedDeptId] = useState('');

  useEffect(() => {
    if (!filtered.length) {
      setSelectedDeptId('');
      return;
    }
    const exists = filtered.some((section) => section.id === selectedDeptId);
    if (!exists) {
      setSelectedDeptId(filtered[0].id);
    }
  }, [filtered, selectedDeptId]);

  const activeSection = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.find((section) => section.id === selectedDeptId) ?? filtered[0];
  }, [filtered, selectedDeptId]);

  const deptFilterControl = filtered.length > 0 ? (
    <DepartmentFilter
      sections={filtered}
      value={activeSection?.id ?? filtered[0].id}
      onChange={setSelectedDeptId}
    />
  ) : null;

  if (sections.length === 0) {
    return (
      <PricingEmpty
        icon={Stethoscope}
        title="No pricing configured"
        description="There are currently no configured department or doctor consultation fees."
      />
    );
  }

  if (filtered.length === 0) {
    return (
      <>
        <SectionHead title="Departments & doctor rates" count={0} />
        <PricingEmpty
          icon={Search}
          title="No results found"
          description="Try a different doctor or department name."
        />
      </>
    );
  }

  const doctorCount = activeSection?.doctors.length ?? 0;

  return (
    <>
      <SectionHead
        title="Departments & doctor rates"
        count={doctorCount}
        countLabel={doctorCount === 1 ? 'doctor' : 'doctors'}
        actions={deptFilterControl}
      />
      {activeSection ? (
        <div className="ipd-pricing__dept-panel">
          {activeSection.departmentFee != null && Number.isFinite(activeSection.departmentFee) ? (
            <p className="ipd-pricing__dept-fee">
              Department rate:{' '}
              <strong>{formatPrice(activeSection.departmentFee)}</strong>
            </p>
          ) : (
            <p className="ipd-pricing__dept-fee ipd-pricing__muted">
              Department rate: Not configured
            </p>
          )}
          {activeSection.doctors.length > 0 ? (
            <div className="ipd-table-wrap ipd-pricing__table-wrap">
              <table className="ipd-table ipd-table--dense ipd-pricing__table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Consultation / Visit</th>
                    <th className="ipd-num">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSection.doctors.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.name}</td>
                      <td>{doc.visitType}</td>
                      <td className="ipd-num ipd-num--strong">{formatPrice(doc.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ipd-pricing__muted">No doctor-specific rates configured.</p>
          )}
        </div>
      ) : null}
    </>
  );
}

function SimplePriceTable({
  title,
  columns,
  rows,
  emptyIcon: Icon,
  emptyTitle,
  emptyDesc,
}) {
  if (!rows.length) {
    return (
      <PricingEmpty icon={Icon} title={emptyTitle} description={emptyDesc} />
    );
  }

  return (
    <>
      <SectionHead title={title} count={rows.length} />
      <div className="ipd-table-wrap ipd-pricing__table-wrap">
        <table className="ipd-table ipd-table--dense ipd-pricing__table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PackageDetailModal({ pkg, onClose }) {
  if (!pkg) return null;

  return (
    <Modal isOpen={Boolean(pkg)} onClose={onClose} title={pkg.name} size="md">
      <div className="ipd-pricing__pkg-detail">
        <dl className="ipd-pricing__pkg-meta">
          <div>
            <dt>Room type</dt>
            <dd>{pkg.wardName ?? pkg.category}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd className="ipd-pricing__pkg-price">{formatPrice(pkg.price)}</dd>
          </div>
          {pkg.dailyRate != null ? (
            <div>
              <dt>Daily rate</dt>
              <dd>{formatPrice(pkg.dailyRate)} / day</dd>
            </div>
          ) : null}
          {pkg.duration ? (
            <div>
              <dt>Duration / Stay</dt>
              <dd>{pkg.duration}</dd>
            </div>
          ) : null}
          <div>
            <dt>Status</dt>
            <dd>
              <StatusBadge status={pkg.status} />
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}

function PackagesSection({ rows, search, onSelect }) {
  const [bedFilter, setBedFilter] = useState('all');

  const filtered = useMemo(() => {
    const bySearch = filterSimpleRows(rows, search, [
      'name',
      'category',
      'status',
      'duration',
      'wardName',
    ]);
    return filterWardRowsByBedCategory(bySearch, bedFilter);
  }, [rows, search, bedFilter]);

  const grouped = useMemo(
    () => groupStayPackagesByWard(filtered),
    [filtered],
  );

  const bedFilterControl = (
    <BedTypeFilter value={bedFilter} onChange={setBedFilter} />
  );

  if (rows.length === 0) {
    return (
      <PricingEmpty
        icon={Package}
        title="No room stay packages available"
        description="Configure ward daily rates to generate stay packages."
      />
    );
  }

  if (grouped.length === 0) {
    return (
      <>
        <SectionHead
          title="Room stay packages"
          count={0}
          actions={bedFilterControl}
        />
        <PricingEmpty
          icon={Search}
          title="No results found"
          description="Try another search term."
        />
      </>
    );
  }

  return (
    <>
      <SectionHead
        title="Room stay packages"
        count={grouped.length}
        countLabel={grouped.length === 1 ? 'room type' : 'room types'}
        actions={bedFilterControl}
      />
      <div className="ipd-table-wrap ipd-pricing__table-wrap ipd-pricing__pkg-matrix-wrap">
        <table className="ipd-table ipd-table--dense ipd-pricing__table ipd-pricing__pkg-matrix">
          <thead>
            <tr>
              <th className="ipd-pricing__pkg-matrix-room">Room / Ward</th>
              <th className="ipd-num ipd-pricing__pkg-matrix-rate">Daily rate</th>
              {STAY_PACKAGE_DURATIONS.map((days) => (
                <th key={days} className="ipd-num ipd-pricing__pkg-matrix-dur">
                  {days} days
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map((group) => (
              <tr key={group.id}>
                <td className="ipd-pricing__pkg-ward-cell">
                  <span className="ipd-pricing__pkg-ward-name">{group.wardName}</span>
                </td>
                <td className="ipd-num ipd-pricing__pkg-matrix-rate">
                  <span className="ipd-num ipd-num--strong">{formatPrice(group.dailyRate)}</span>
                </td>
                {STAY_PACKAGE_DURATIONS.map((days) => {
                  const pkg = group.packagesByDays[days];
                  return (
                    <td key={days} className="ipd-num ipd-pricing__pkg-matrix-cell">
                      {pkg ? (
                        <button
                          type="button"
                          className="ipd-pricing__pkg-matrix-price"
                          onClick={() => onSelect(pkg)}
                          title={`${group.wardName} — ${days} days (${formatPrice(pkg.price)})`}
                        >
                          {formatPrice(pkg.price)}
                        </button>
                      ) : (
                        <span className="ipd-pricing__muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function IpdPricingPage() {
  const [category, setCategory] = useState('wards');
  const [search, setSearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);

  const settingsQuery = useIpdPricingSettingsQuery();
  const departmentsQuery = useIpdDepartmentsQuery();
  const wardsQuery = useIpdWardStatsQuery();
  const bedsQuery = useIpdBedsQuery({});

  const dummyPricing = useMemo(() => getDummyPricingSettings(), []);
  const settingsUnavailable = settingsQuery.data?.source === 'unavailable';

  const pricing = settingsUnavailable
    ? dummyPricing
    : (settingsQuery.data?.pricing ?? dummyPricing);

  const bedTariff = pricing?.bed_tariff ?? dummyPricing.bed_tariff;

  const wardRows = useMemo(() => {
    const names = collectPricingWardNames(
      wardsQuery.data,
      bedsQuery.data?.beds ?? [],
      bedTariff,
    );
    const wardNameList = names.length > 0 ? names : DUMMY_WARD_NAMES;
    const built = buildWardPricingRows(bedTariff, wardNameList, []);
    const rows = built.length > 0 ? built : DUMMY_WARD_ROWS;
    return dedupeWardPricingRows(rows).filter((row) => row.kind !== 'special');
  }, [bedTariff, wardsQuery.data, bedsQuery.data?.beds]);

  const doctorRows = useMemo(() => {
    const live = buildDoctorPricingSections(pricing);
    const dummy = buildDoctorPricingSections(dummyPricing);
    const priced = pickWithFallback(live, dummy);
    return mergeDoctorPricingWithHospitalDepartments(
      priced,
      departmentsQuery.data ?? [],
    );
  }, [pricing, dummyPricing, departmentsQuery.data]);

  const diagnosticRows = useMemo(() => {
    const live = filterSimpleRows(
      buildBillItemRows(pricing, 'diagnostics'),
      search,
      ['name', 'category'],
    );
    const dummy = filterSimpleRows(
      buildBillItemRows(dummyPricing, 'diagnostics'),
      search,
      ['name', 'category'],
    );
    return pickWithFallback(live, dummy);
  }, [pricing, dummyPricing, search]);

  const procedureRows = useMemo(() => {
    const live = filterSimpleRows(
      buildBillItemRows(pricing, 'procedures'),
      search,
      ['name', 'category'],
    );
    const dummy = filterSimpleRows(
      buildBillItemRows(dummyPricing, 'procedures'),
      search,
      ['name', 'category'],
    );
    return pickWithFallback(live, dummy);
  }, [pricing, dummyPricing, search]);

  const otherRows = useMemo(() => {
    const live = filterSimpleRows(buildOtherChargeRows(pricing), search, [
      'charge',
      'description',
    ]);
    const dummy = filterSimpleRows(buildOtherChargeRows(dummyPricing), search, [
      'charge',
      'description',
    ]);
    return pickWithFallback(live, dummy);
  }, [pricing, dummyPricing, search]);

  const packageRows = useMemo(() => {
    const wardForPackages = wardRows.filter((row) => row.kind !== 'special');
    const packages = buildStayPackageRows(wardForPackages);
    if (packages.length > 0) {
      return filterSimpleRows(packages, search, [
        'name',
        'category',
        'duration',
        'wardName',
      ]);
    }
    const dummyPackages = buildStayPackageRows(
      DUMMY_WARD_ROWS.filter((row) => row.kind !== 'special'),
    );
    return filterSimpleRows(dummyPackages, search, [
      'name',
      'category',
      'duration',
      'wardName',
    ]);
  }, [wardRows, search]);

  const loading = settingsQuery.isLoading || wardsQuery.isLoading;

  const categoryContent = () => {
    switch (category) {
      case 'wards':
        return (
          <WardsSection
            rows={filterWardRows(wardRows, search)}
            search={search}
          />
        );
      case 'doctors':
        return (
          <DoctorsSection
            sections={doctorRows}
            search={search}
          />
        );
      case 'diagnostics':
        if (diagnosticRows.length === 0) {
          return (
            <>
              <SectionHead title="Diagnostics" count={0} />
              <PricingEmpty
                icon={Search}
                title="No results found"
                description="Try another search term."
              />
            </>
          );
        }
        return (
          <SimplePriceTable
            title="Diagnostics"
            emptyIcon={FlaskConical}
            emptyTitle="No diagnostic pricing configured"
            emptyDesc="There are currently no configured laboratory or imaging rates."
            columns={[
              { key: 'name', label: 'Test / Service' },
              { key: 'category', label: 'Category' },
              {
                key: 'price',
                label: 'Price',
                className: 'ipd-num',
                render: (row) => (
                  <span className="ipd-num ipd-num--strong">{formatPrice(row.price)}</span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
            ]}
            rows={diagnosticRows}
          />
        );
      case 'procedures':
        if (procedureRows.length === 0) {
          return (
            <>
              <SectionHead title="Procedures & services" count={0} />
              <PricingEmpty
                icon={Search}
                title="No results found"
                description="Try another search term."
              />
            </>
          );
        }
        return (
          <SimplePriceTable
            title="Procedures & services"
            emptyIcon={Wrench}
            emptyTitle="No procedure pricing configured"
            emptyDesc="There are currently no configured procedure or service rates."
            columns={[
              { key: 'name', label: 'Procedure / Service' },
              { key: 'category', label: 'Category' },
              {
                key: 'price',
                label: 'Price',
                className: 'ipd-num',
                render: (row) => (
                  <span className="ipd-num ipd-num--strong">{formatPrice(row.price)}</span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
            ]}
            rows={procedureRows}
          />
        );
      case 'packages':
        return (
          <PackagesSection
            rows={packageRows}
            search={search}
            onSelect={setSelectedPackage}
          />
        );
      case 'other':
        if (otherRows.length === 0) {
          return (
            <>
              <SectionHead title="Other charges" count={0} />
              <PricingEmpty
                icon={Search}
                title="No results found"
                description="Try another search term."
              />
            </>
          );
        }
        return (
          <SimplePriceTable
            title="Other charges"
            emptyIcon={Tags}
            emptyTitle="No other charges configured"
            emptyDesc="No additional reference charges are configured."
            columns={[
              { key: 'charge', label: 'Charge' },
              { key: 'description', label: 'Description' },
              {
                key: 'amount',
                label: 'Amount',
                className: 'ipd-num',
                render: (row) => (
                  <span className="ipd-num ipd-num--strong">{formatPrice(row.amount)}</span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
            ]}
            rows={otherRows}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="ipd-page ipd-pricing">
      <header className="ipd-pricing__header">
        <div className="ipd-pricing__header-text">
          <h1 className="ipd-page__title">IPD Pricing</h1>
        </div>
        <div className="ipd-pricing__header-tools">
          <label className="ipd-pricing__search">
            <Search size={16} aria-hidden className="ipd-pricing__search-icon" />
            <input
              type="search"
              className="ipd-input ipd-pricing__search-input"
              placeholder="Search pricing…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search pricing"
            />
          </label>
        </div>
      </header>

      <nav className="ipd-pricing__nav" aria-label="Pricing categories">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`ipd-pricing__nav-btn${active ? ' is-active' : ''}`}
              onClick={() => {
                setCategory(cat.id);
                setSearch('');
              }}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={15} aria-hidden />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="ipd-pricing__panel">
        <QueryFeedback
          isLoading={loading}
          isError={settingsQuery.isError}
          error={settingsQuery.error}
          loadingLabel="Loading pricing…"
        />
        {!loading ? categoryContent() : null}
      </div>

      <PackageDetailModal
        pkg={selectedPackage}
        onClose={() => setSelectedPackage(null)}
      />
    </div>
  );
}
