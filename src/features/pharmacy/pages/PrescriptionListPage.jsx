import { useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { usePharmacyPrescriptionsQuery } from '@/shared/hooks/queries/usePharmacyQuery';
import { useNavigate } from 'react-router-dom';
import PharmacyLayout from '@/features/pharmacy/components/PharmacyLayout';
import PharmacyStatusBadge from '@/features/pharmacy/components/PharmacyStatusBadge';
import {
  DataTableShell,
  EmptyState,
  QueryFeedback,
  SearchBar,
} from '@/shared/components/common';
import { formatPharmacyPatientIdDisplay } from '@/shared/api/mappers/pharmacyMapper';
import './PrescriptionListPage.css';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'partially_dispensed', label: 'Partially dispensed' },
  { value: 'dispensed', label: 'Dispensed' },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

/** YYYY-MM-DD in local time for <input type="date"> comparison. */
function toLocalDateKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
}

export default function PrescriptionListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const status = statusFilter === 'all' ? undefined : statusFilter;

  const { data, isLoading, isError, error } = usePharmacyPrescriptionsQuery({
    status,
    search: debouncedSearch || undefined,
  });

  const allPrescriptions = data?.data ?? [];
  const prescriptions = dateFilter
    ? allPrescriptions.filter((rx) => toLocalDateKey(rx.created_at) === dateFilter)
    : allPrescriptions;
  const statusLabel = STATUS_LABELS[statusFilter] ?? 'All';
  const hasActiveFilters = Boolean(debouncedSearch) || Boolean(dateFilter);

  return (
    <PharmacyLayout compact>
      <div className="pharmacy-rx-page">
        <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
          <div
            className={`pharmacy-rx-card${
              prescriptions.length === 0 ? ' pharmacy-rx-card--empty' : ''
            }`}
          >
            <div className="pharmacy-rx-card__toolbar">
              <div className="pharmacy-rx-toolbar-strip">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search…"
                  className="pharmacy-rx-card__search"
                />
                <span className="pharmacy-rx-toolbar-strip__divider" aria-hidden />
                <label className="pharmacy-rx-filter">
                  <span
                    className={`pharmacy-rx-filter__dot pharmacy-rx-filter__dot--${statusFilter}`}
                    aria-hidden
                  />
                  <select
                    className="pharmacy-rx-filter__select"
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="pharmacy-rx-toolbar-strip__divider" aria-hidden />
                <label className="pharmacy-rx-date-filter">
                  <input
                    type="date"
                    className="pharmacy-rx-date-filter__input"
                    aria-label="Filter by date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                  {dateFilter && (
                    <button
                      type="button"
                      className="pharmacy-rx-date-filter__clear"
                      aria-label="Show all time"
                      title="Show all time"
                      onClick={() => setDateFilter('')}
                    >
                      ×
                    </button>
                  )}
                </label>
              </div>
              <span className="pharmacy-rx-card__meta">
                <strong>{prescriptions.length}</strong> · {statusLabel}
                {dateFilter ? ` · ${formatDate(dateFilter)}` : ' · All time'}
              </span>
            </div>

            {prescriptions.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? 'No matching prescriptions' : 'No prescriptions found'}
                description={
                  hasActiveFilters
                    ? 'Try a different search term, status or date filter.'
                    : `No ${statusLabel.toLowerCase()} prescriptions at the moment.`
                }
              />
            ) : (
              <DataTableShell>
                <table className="data-table pharmacy-rx-table">
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Diagnosis</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((rx) => (
                      <tr
                        key={rx.id}
                        className="pharmacy-rx-table__row"
                        onClick={() => navigate(`/pharmacy/prescriptions/${rx.id}`)}
                      >
                        <td>
                          <span className="pharmacy-rx-table__id">
                            {formatPharmacyPatientIdDisplay(rx)}
                          </span>
                        </td>
                        <td className="pharmacy-rx-table__patient-cell">
                          <span className="pharmacy-rx-table__patient">
                            {rx.patient_name || '—'}
                          </span>
                          {rx.patient_allergies && (
                            <span className="pharmacy-allergy-tag">Allergies</span>
                          )}
                        </td>
                        <td className="pharmacy-rx-table__doctor">{rx.doctor_name}</td>
                        <td className="pharmacy-rx-table__diagnosis">{rx.diagnosis}</td>
                        <td>
                          <PharmacyStatusBadge status={rx.status} />
                        </td>
                        <td className="pharmacy-rx-table__date">{formatDate(rx.created_at)}</td>
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
