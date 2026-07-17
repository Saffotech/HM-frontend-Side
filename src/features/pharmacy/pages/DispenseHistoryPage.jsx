import { useState, useMemo } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Rows3 } from 'lucide-react';
import PharmacyLayout from '@/features/pharmacy/components/PharmacyLayout';
import PharmacyStatusBadge from '@/features/pharmacy/components/PharmacyStatusBadge';
import {
  DataTableShell,
  DateInput,
  EmptyState,
  QueryFeedback,
  SearchBar,
} from '@/shared/components/common';
import {
  usePharmacyHistoryQuery,
  PHARMACY_HISTORY_PAGE_SIZES,
} from '@/shared/hooks/queries/usePharmacyQuery';
import PharmacyTruncatedText from '@/features/pharmacy/components/PharmacyTruncatedText';
import { formatPharmacyPatientIdDisplay } from '@/shared/api/mappers/pharmacyMapper';
import './DispenseHistoryPage.css';

const MEDICINES_TEXT_MAX = 48;

function fmtDt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function matchesHistorySearch(row, search) {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  return (
    String(row.patient_uid ?? '').toLowerCase().includes(term) ||
    String(row.prescription_id ?? '').includes(term) ||
    (row.patient_name ?? '').toLowerCase().includes(term) ||
    (row.medicines_summary ?? '').toLowerCase().includes(term) ||
    (row.medicine_name ?? '').toLowerCase().includes(term) ||
    (row.pharmacist_name ?? '').toLowerCase().includes(term) ||
    String(row.quantity_dispensed ?? '').includes(term)
  );
}

export default function DispenseHistoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data, isLoading, isError, error } = usePharmacyHistoryQuery({
    page,
    limit: pageSize,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const allRows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const rows = useMemo(
    () => allRows.filter((row) => matchesHistorySearch(row, debouncedSearch)),
    [allRows, debouncedSearch]
  );

  const hasDateFilter = Boolean(dateFrom || dateTo);
  const hasActiveFilters = Boolean(debouncedSearch) || hasDateFilter;
  const displayCount = debouncedSearch ? rows.length : total;

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const clearDateRange = () => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <PharmacyLayout compact>
      <div className="pharmacy-history-page">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
          <div
            className={`pharmacy-history-card${
              rows.length === 0 ? ' pharmacy-history-card--empty' : ''
            }`}
          >
            <div className="pharmacy-history-card__toolbar">
              <div className="pharmacy-history-toolbar-strip">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search…"
                  className="pharmacy-history-card__search"
                />
                <span className="pharmacy-history-toolbar-strip__divider" aria-hidden />
                <div className="pharmacy-history-date-range">
                  <DateInput
                    className="pharmacy-history-date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    aria-label="From date"
                    placeholder="From"
                  />
                  <span className="pharmacy-history-date-range__sep" aria-hidden>
                    to
                  </span>
                  <DateInput
                    className="pharmacy-history-date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    aria-label="To date"
                    placeholder="To"
                  />
                  {hasDateFilter && (
                    <button
                      type="button"
                      className="pharmacy-history-date-range__clear"
                      onClick={clearDateRange}
                      title="Show all time"
                      aria-label="Clear date range"
                    >
                      ×
                    </button>
                  )}
                </div>
                <span className="pharmacy-history-toolbar-strip__divider" aria-hidden />
                <label className="pharmacy-history-pagesize">
                  <Rows3 size={13} className="pharmacy-history-pagesize__icon" aria-hidden />
                  <span className="pharmacy-history-pagesize__label">Show</span>
                  <select
                    className="pharmacy-history-pagesize__select"
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                  >
                    {PHARMACY_HISTORY_PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} rows
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <span className="pharmacy-history-card__meta">
                <strong>{displayCount}</strong> record{displayCount !== 1 ? 's' : ''}
                {hasDateFilter ? (
                  <span className="pharmacy-history-card__meta-note"> · date range</span>
                ) : (
                  <span className="pharmacy-history-card__meta-note"> · all time</span>
                )}
                {debouncedSearch && allRows.length !== rows.length && (
                  <span className="pharmacy-history-card__meta-note"> · filtered</span>
                )}
              </span>
            </div>

            {rows.length === 0 ? (
              <EmptyState
                title={
                  hasActiveFilters ? 'No matching dispensing records' : 'No dispensing records yet'
                }
                description={
                  hasActiveFilters
                    ? 'Try a different search term or date range.'
                    : 'Completed dispense records will appear here.'
                }
              />
            ) : (
              <DataTableShell
                pagination={{
                  page,
                  totalPages,
                  totalItems: total,
                  pageSize,
                  onPageChange: setPage,
                }}
              >
                <table className="data-table pharmacy-history-table">
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Patient</th>
                      <th>Medicines</th>
                      <th className="pharmacy-history-table__col-qty">Qty</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="pharmacy-history-table__row">
                        <td>
                          <span className="pharmacy-history-table__id">
                            {formatPharmacyPatientIdDisplay(row)}
                          </span>
                        </td>
                        <td className="pharmacy-history-table__patient-cell">
                          <span className="pharmacy-history-table__patient">
                            {row.patient_name || '—'}
                          </span>
                        </td>
                        <td className="pharmacy-history-table__meds">
                          <PharmacyTruncatedText
                            text={row.medicines_summary}
                            maxLength={MEDICINES_TEXT_MAX}
                          />
                        </td>
                        <td className="pharmacy-history-table__qty">{row.quantity_dispensed ?? '—'}</td>
                        <td className="pharmacy-history-table__status">
                          <PharmacyStatusBadge status={row.status} />
                        </td>
                        <td className="pharmacy-history-table__date">{fmtDt(row.dispensed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTableShell>
            )}
          </div>
        </QueryFeedback>
      </div>
    </PharmacyLayout>
  );
}
