import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Banknote, CreditCard, Smartphone, IndianRupee } from 'lucide-react';
import {
  usePaymentHistoryQuery,
  PAYMENT_HISTORY_PAGE_SIZE,
} from '@/shared/hooks/queries/useBillingQuery';
import { useTableSort } from '@/shared/hooks/useTableSort';
import {
  Button,
  SearchBar,
  AnalyticsCard,
  DataTableShell,
  QueryFeedback,
  MoneyAmount,
} from '@/shared/components/common';
import './PaymentHistoryPage.css';

const MODE_CLASS = {
  Cash: 'mode-cash',
  Card: 'mode-card',
  UPI: 'mode-upi',
  Online: 'mode-upi',
  Insurance: 'mode-insurance',
};

export default function PaymentHistoryPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = usePaymentHistoryQuery({
    search,
    modeFilter: activeFilter,
    page,
  });

  const summary = data?.summary;
  const payments = data?.payments ?? [];
  const pagination = data?.pagination;

  const { sorted, sortKey, sortDir, toggleSort } = useTableSort(payments, 'dateSort', 'desc');

  useEffect(() => {
    setPage(1);
  }, [search, activeFilter]);

  const totalPages = pagination?.totalPages ?? 1;
  const totalItems = pagination?.totalItems ?? sorted.length;
  const pageSize = PAYMENT_HISTORY_PAGE_SIZE;

  const cards = [
    {
      key: 'all',
      label: 'Total Collected',
      value: <MoneyAmount amount={summary?.totalCollected ?? 0} exact />,
      icon: IndianRupee,
      color: 'blue',
      sub: `${summary?.transactionCount ?? 0} transactions`,
    },
    {
      key: 'UPI',
      label: 'Online / UPI',
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
  ];

  if ((summary?.insurance ?? 0) > 0) {
    cards.push({
      key: 'Insurance',
      label: 'Insurance',
      value: <MoneyAmount amount={summary.insurance} exact />,
      icon: IndianRupee,
      color: 'blue',
      sub: 'Included in total',
    });
  }

  const SortTh = ({ label, field, className = '' }) => (
    <th
      className={`sortable ${sortKey === field ? 'sorted' : ''} ${className}`.trim()}
      onClick={() => toggleSort(field)}
    >
      <span className="th-sort-inner">
        {label}
        <span className="sort-icon">{sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </span>
    </th>
  );

  const invoiceLink = (row) =>
    row.billId && row.billId !== '—' ? `/billing/${row.billId}` : null;

  return (
    <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
      <div className="payment-history page-stack">
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
            Showing <strong>{activeFilter === 'UPI' ? 'Online / UPI' : activeFilter}</strong>{' '}
            payments only.
            <button type="button" className="filter-hint__clear" onClick={() => setActiveFilter('all')}>
              Clear filter
            </button>
          </p>
        )}

        <div className="card">
          <div className="page-toolbar">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search patient, ID, or bill..."
              className="search-bar--wide"
            />
          </div>

          <DataTableShell
            className="payment-history-table-shell"
            maxHeight="420px"
            pagination={{
              page,
              totalPages,
              totalItems,
              pageSize,
              onPageChange: setPage,
            }}
          >
            <table className="data-table payment-history-table">
              <colgroup>
                <col className="col-patient" />
                <col className="col-bill-id" />
                <col className="col-date" />
                <col className="col-mode" />
                <col className="col-money" />
                <col className="col-action" />
              </colgroup>
              <thead>
                <tr>
                  <SortTh label="Patient" field="patientName" />
                  <SortTh label="Bill" field="billId" />
                  <SortTh label="Date" field="dateSort" />
                  <SortTh label="Mode" field="mode" />
                  <SortTh label="Amount" field="amount" className="col-money" />
                  <th className="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const href = invoiceLink(r);
                  return (
                    <tr key={r.id}>
                      <td className="col-patient">
                        <strong>{r.patientName}</strong>
                        <div className="text-muted">{r.patientId}</div>
                      </td>
                      <td className="col-bill-id">
                        <span className="id-badge">{r.billId}</span>
                      </td>
                      <td className="col-date">{r.date}</td>
                      <td className="col-mode">
                        <span className={`mode-badge ${MODE_CLASS[r.mode] || 'mode-cash'}`}>
                          {r.mode}
                        </span>
                      </td>
                      <td className="text-green col-money">
                        <MoneyAmount amount={r.amount} strong />
                        {r.billBalance > 0 && (
                          <div className="text-muted payment-history-table__due">
                            Bill due: <MoneyAmount amount={r.billBalance} />
                          </div>
                        )}
                      </td>
                      <td className="col-action actions-cell">
                        {href ? (
                          <Link to={href} className="profile-link-btn">
                            <Button variant="outline" size="sm">
                              View <ChevronRight size={14} />
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!sorted.length && (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      No payment records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </DataTableShell>
        </div>
      </div>
    </QueryFeedback>
  );
}
