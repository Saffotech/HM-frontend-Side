/**
 * IPD payment history — aligned with OPD Payment History (filters + View/Print).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  ChevronRight,
  CreditCard,
  IndianRupee,
  Printer,
  Smartphone,
} from 'lucide-react';
import {
  AnalyticsCard,
  Button,
  MoneyAmount,
  QueryFeedback,
} from '@/shared/components/common';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { ROUTES } from '@/shared/constants';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import { useIpdPaymentHistoryQuery } from '@/features/ipd/hooks/useIpdQuery';
import { IPD_PAGE_SIZE } from '@/features/ipd/utils/constants';
import { formatIpdDateTime } from '@/features/ipd/utils/ipdFormat';
import { formatCurrency } from '@/shared/utils/formatCurrency';

import '@/features/opd/billing/pages/PaymentHistoryPage.css';

const MODE_CLASS = {
  cash: 'mode-cash',
  card: 'mode-card',
  upi: 'mode-upi',
  insurance: 'mode-insurance',
};

function titleCaseMode(mode) {
  const key = String(mode || '').toLowerCase();
  if (key === 'upi') return 'UPI';
  if (!key) return '—';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function billViewPath(billId, { print = false } = {}) {
  if (!billId) return null;
  const base = ROUTES.IPD_BILL_VIEW.replace(':billId', String(billId));
  return print ? `${base}?print=1` : base;
}

export default function IpdPaymentHistoryPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError, error, refetch } = useIpdPaymentHistoryQuery({
    search: debouncedSearch,
    modeFilter: activeFilter,
    page,
    limit: IPD_PAGE_SIZE,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter]);

  const summary = data?.summary;
  const rows = data?.items ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / IPD_PAGE_SIZE));

  const cards = [
    {
      key: 'all',
      label: 'Total Collected',
      value: <MoneyAmount amount={summary?.total_collected ?? 0} exact />,
      icon: IndianRupee,
      color: 'blue',
      sub: `${summary?.transaction_count ?? 0} transactions`,
    },
    {
      key: 'UPI',
      label: 'UPI',
      value: <MoneyAmount amount={summary?.upi ?? 0} exact />,
      icon: Smartphone,
      color: 'purple',
    },
    {
      key: 'Cash',
      label: 'Cash',
      value: <MoneyAmount amount={summary?.cash ?? 0} exact />,
      icon: Banknote,
      color: 'green',
    },
    {
      key: 'Card',
      label: 'Card',
      value: <MoneyAmount amount={summary?.card ?? 0} exact />,
      icon: CreditCard,
      color: 'blue',
    },
    {
      key: 'Insurance',
      label: 'Insurance',
      value: <MoneyAmount amount={summary?.insurance ?? 0} exact />,
      icon: IndianRupee,
      color: 'blue',
      sub: 'Included in total',
    },
  ];

  return (
    <div className="ipd-page ipd-page--compact ipd-payment-history">
      <IpdPageHeader title="Payment History" />

      <div className="analytics-grid payment-history__cards">
        {cards.map((c) => (
          <AnalyticsCard
            key={c.key}
            label={c.label}
            value={c.value}
            icon={c.icon}
            color={c.color}
            sublabel={c.sub}
            active={activeFilter === c.key}
            onClick={() => setActiveFilter(c.key)}
          />
        ))}
      </div>

      {activeFilter !== 'all' && (
        <p className="filter-hint">
          Showing <strong>{activeFilter}</strong> payments only.
          <button
            type="button"
            className="filter-hint__clear"
            onClick={() => setActiveFilter('all')}
          >
            Clear filter
          </button>
        </p>
      )}

      <div className="ipd-card">
        <div className="ipd-card__body ipd-payment-history__toolbar">
          <div className="ipd-toolbar">
            <div className="ipd-toolbar__field ipd-beds-filters__search">
              <label className="ipd-toolbar__label" htmlFor="ipd-ph-search">
                Search
              </label>
              <input
                id="ipd-ph-search"
                className="ipd-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Receipt, patient, admission, bill…"
              />
            </div>
          </div>
        </div>

        {isError ? (
          <div className="ipd-card__body">
            <QueryFeedback isError error={error} onRetry={refetch} />
          </div>
        ) : isLoading ? (
          <div className="ipd-card__body" style={{ display: 'grid', gap: '0.4rem' }}>
            <div className="ipd-skeleton" />
            <div className="ipd-skeleton" />
            <div className="ipd-skeleton" />
          </div>
        ) : (
          <>
            <div className="ipd-table-wrap">
              <table className="ipd-table ipd-table--payments">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Bill</th>
                    <th>Admission</th>
                    <th>Mode</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-row">
                        No payment records found
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const viewHref = billViewPath(row.bill_id);
                      const printHref = billViewPath(row.bill_id, { print: true });
                      const modeKey = String(row.mode || '').toLowerCase();
                      return (
                        <tr key={row.id}>
                          <td>{formatIpdDateTime(row.paid_at)}</td>
                          <td>
                            <strong>{row.patient_name || '—'}</strong>
                            {row.patient_uid ? (
                              <div className="ipd-page__subtitle">{row.patient_uid}</div>
                            ) : null}
                          </td>
                          <td>
                            <span className="id-badge">{row.bill_number || '—'}</span>
                          </td>
                          <td>{row.admission_no || row.admission_id || '—'}</td>
                          <td>
                            <span className={`mode-badge ${MODE_CLASS[modeKey] || 'mode-cash'}`}>
                              {titleCaseMode(row.mode)}
                            </span>
                          </td>
                          <td className="text-green">
                            {formatCurrency(row.amount, { empty: '—' })}
                            {Number(row.bill_balance) > 0 ? (
                              <div className="ipd-page__subtitle">
                                Bill due: {formatCurrency(row.bill_balance, { empty: '—' })}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <div className="ipd-table__actions">
                              {viewHref ? (
                                <>
                                  <Link to={viewHref} className="profile-link-btn">
                                    <Button variant="outline" size="sm">
                                      View <ChevronRight size={14} />
                                    </Button>
                                  </Link>
                                  <Link to={printHref} className="profile-link-btn">
                                    <Button variant="outline" size="sm">
                                      <Printer size={14} /> Print
                                    </Button>
                                  </Link>
                                </>
                              ) : (
                                <span className="ipd-page__subtitle">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalItems > IPD_PAGE_SIZE ? (
              <div className="ipd-card__body ipd-beds-pager">
                <span className="ipd-page__subtitle">
                  Page {page} of {totalPages} · {totalItems} payment
                  {totalItems === 1 ? '' : 's'}
                </span>
                <div className="ipd-beds-pager__controls">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
