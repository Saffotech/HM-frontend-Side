import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useBillsQuery, BILLS_PAGE_SIZE } from '@/shared/hooks/queries/useBillingQuery';
import { asBillList } from '@/shared/hooks/queries/listDataUtils';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { usePagination } from '@/shared/hooks/usePagination';
import { useTableSort } from '@/shared/hooks/useTableSort';
import {
  Button,
  Input,
  Select,
  StatusBadge,
  SearchBar,
  DataTableShell,
  QueryFeedback,
  MoneyAmount,
  Modal,
} from '@/shared/components/common';
import CollectPaymentModal from '@/features/opd/billing/components/CollectPaymentModal';
import PatientBillsPrintSheet from '@/features/opd/billing/components/PatientBillsPrintSheet';
import { formatBillDate } from '@/shared/utils/billHelpers';
import { getLocalDayRangeIso } from '@/shared/utils/opdDates';
import { ROUTES } from '@/shared/constants';
import './BillingListPage.css';

const STATUS_TO_API = { Unpaid: 'pending', Partial: 'partial', Paid: 'paid' };

function groupBillsByPatient(bills) {
  const map = new Map();
  for (const bill of bills) {
    const key = bill.patientId ?? bill.patientUid ?? bill.patientName ?? bill.id;
    if (!map.has(key)) {
      map.set(key, {
        key,
        patientId: bill.patientId ?? bill.patientUid,
        patientName: bill.patientName,
        bills: [],
        total: 0,
        paid: 0,
        balance: 0,
      });
    }
    const group = map.get(key);
    group.bills.push(bill);
    group.total += bill.total ?? 0;
    group.paid += bill.paid ?? 0;
    group.balance += bill.balance ?? 0;
  }

  return Array.from(map.values()).map((group) => {
    const sortedBills = [...group.bills].sort(
      (a, b) => new Date(b.dateIso ?? b.date) - new Date(a.dateIso ?? a.date)
    );
    const balance = Math.round(group.balance * 100) / 100;
    const paid = Math.round(group.paid * 100) / 100;
    let status = 'Unpaid';
    if (balance <= 0.01) status = 'Paid';
    else if (paid > 0) status = 'Partial';

    return {
      ...group,
      bills: sortedBills,
      total: Math.round(group.total * 100) / 100,
      paid,
      balance,
      status,
      billCount: sortedBills.length,
      latestDate: sortedBills[0]?.date ?? '',
      latestDateIso: sortedBills[0]?.dateIso ?? sortedBills[0]?.date ?? '',
    };
  });
}

export default function BillingListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateScope, setDateScope] = useState('All');
  const [customDate, setCustomDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState();
  const [billsModalGroup, setBillsModalGroup] = useState(null);
  const [printGroup, setPrintGroup] = useState(null);
  const pageSize = BILLS_PAGE_SIZE;
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = formatBillDate(yesterdayDate);
  const useClientDateFilter = dateScope === 'Yesterday' || dateScope === 'Custom';
  const rangeFromIso =
    dateScope === 'Range' && dateFrom
      ? getLocalDayRangeIso(new Date(dateFrom)).dateFrom
      : undefined;
  const rangeToIso =
    dateScope === 'Range' && dateTo
      ? getLocalDayRangeIso(new Date(dateTo)).dateTo
      : undefined;

  const { data, isLoading, isError, error } = useBillsQuery({
    fetchAll: true,
    search: debouncedSearch || undefined,
    today_only: dateScope === 'Today',
    from_date: rangeFromIso,
    to_date: rangeToIso,
    status: statusFilter === 'All' ? undefined : STATUS_TO_API[statusFilter],
  });

  const bills = asBillList(data);
  const filtered = bills.filter((b) => {
    if (!useClientDateFilter) return true;
    const customDateStr = customDate ? formatBillDate(new Date(customDate)) : '';
    if (dateScope === 'Yesterday') return b.date === yesterdayStr;
    if (dateScope === 'Custom') return !customDateStr || b.date === customDateStr;
    return true;
  });

  const patientGroups = useMemo(() => groupBillsByPatient(filtered), [filtered]);
  const { sorted, sortKey, sortDir, toggleSort } = useTableSort(patientGroups, 'latestDateIso', 'desc');
  const { paginatedItems, page, totalPages, totalItems, goToPage, resetPage: setServerPageReset } =
    usePagination(sorted, pageSize);

  useEffect(() => {
    setServerPageReset();
  }, [debouncedSearch, statusFilter, dateScope, customDate, dateFrom, dateTo, setServerPageReset]);

  const totalBilled = filtered.reduce((s, b) => s + b.total, 0);
  const totalCollected = filtered.reduce((s, b) => s + b.paid, 0);
  const totalOutstanding = filtered.reduce((s, b) => s + b.balance, 0);
  const collectionRate =
    totalBilled > 0 ? Math.min(100, Math.round((totalCollected / totalBilled) * 100)) : 0;

  const SortTh = ({ label, field, className = '' }) => (
    <th
      className={`sortable ${sortKey === field ? 'sorted' : ''} ${className}`.trim()}
      onClick={() => toggleSort(field)}
    >
      <span className="billing-table__th-inner">
        <span className="billing-table__th-label">{label}</span>
        <span className="sort-icon">{sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </span>
    </th>
  );

  return (
    <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
    <div className="billing-list page-stack billing-list-page">
      <div className="stat-grid stat-grid--4">
        <div className="stat-card stat-card--money">
          <p className="stat-card__label">Total Billed</p>
          <div className="stat-card__value">
            <MoneyAmount amount={totalBilled} compact />
          </div>
        </div>
        <div className="stat-card stat-card--money">
          <p className="stat-card__label">Collected</p>
          <div className="stat-card__value stat-card__value--green">
            <MoneyAmount amount={totalCollected} compact />
          </div>
        </div>
        <div className="stat-card stat-card--money">
          <p className="stat-card__label">Pending Amount</p>
          <div className="stat-card__value stat-card__value--red">
            <MoneyAmount amount={totalOutstanding} compact />
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-card__label">Collection Rate</p>
          <p className="stat-card__value stat-card__value--blue">{collectionRate}%</p>
          <div className="progress-bar">
            <div style={{ width: `${collectionRate}%` }} />
          </div>
        </div>
      </div>

      <div className="page-header">
        <h2 className="page-title">Billing & Payments</h2>
        <div className="page-header__actions">
          <Button
            variant="success"
            onClick={() => {
              setSelectedBillId(undefined);
              setPaymentModalOpen(true);
            }}
          >
            + Collect Payment
          </Button>
          <Link to={ROUTES.BILLING_OPD_NEW}>
            <Button>Generate Bill</Button>
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="page-toolbar billing-list-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search patient or bill ID..."
            className="billing-list-toolbar__search"
          />
          <Select
            value={dateScope}
            onChange={setDateScope}
            className="billing-list-toolbar__date-scope"
            options={[
              { value: 'All', label: 'All Dates' },
              { value: 'Today', label: 'Today' },
              { value: 'Yesterday', label: 'Yesterday' },
              { value: 'Custom', label: 'Custom Date' },
              { value: 'Range', label: 'Date Range' },
            ]}
          />
          {dateScope === 'Custom' && (
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="billing-list-toolbar__date-input"
            />
          )}
          {dateScope === 'Range' && (
            <>
              <Input
                type="date"
                label="From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="billing-list-toolbar__date-input"
              />
              <Input
                type="date"
                label="To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="billing-list-toolbar__date-input"
              />
            </>
          )}
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className="billing-list-toolbar__status"
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Paid', label: 'Paid' },
              { value: 'Unpaid', label: 'Unpaid' },
              { value: 'Partial', label: 'Partial' },
            ]}
          />
        </div>

        <DataTableShell
          maxHeight="420px"
          pagination={{
            page,
            totalPages,
            totalItems,
            pageSize,
            onPageChange: goToPage,
          }}
        >
          <table className="data-table billing-table">
            <colgroup>
              <col className="billing-table__col-patient" />
              <col className="billing-table__col-bills" />
              <col className="billing-table__col-money" />
              <col className="billing-table__col-money billing-table__col-balance" />
              <col className="billing-table__col-status" />
              <col className="billing-table__col-actions" />
              <col className="billing-table__col-print" />
            </colgroup>
            <thead>
              <tr>
                <SortTh label="Patient" field="patientName" />
                <SortTh label="Bills" field="billCount" />
                <SortTh label="Total" field="total" className="col-money" />
                <SortTh label="Balance" field="balance" className="col-optional col-money" />
                <th className="billing-table__col-status">Status</th>
                <th className="billing-table__col-actions">Actions</th>
                <th className="billing-table__col-print">Print</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((group) => {
                const unpaidBill = group.bills.find((b) => b.balance > 0);
                return (
                  <tr
                    key={group.key}
                    className="billing-table__row"
                    onClick={() => {
                      if (group.patientId) {
                        navigate(`/patients/${group.patientId}/profile`);
                      }
                    }}
                  >
                    <td className="billing-table__cell-patient">
                      <div className="billing-table__patient">
                        <strong>{group.patientName}</strong>
                        {group.patientId && <span className="text-muted">{group.patientId}</span>}
                      </div>
                    </td>
                    <td className="billing-table__cell-bills" onClick={(e) => group.billCount > 1 && e.stopPropagation()}>
                      {group.billCount === 1 ? (
                        <button
                          type="button"
                          className="billing-table__bill-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${ROUTES.BILLING}/${group.bills[0].id}`);
                          }}
                        >
                          <span className="id-badge">{group.bills[0].id}</span>
                          <span className="text-muted">
                            {group.bills[0].date.split(' ').slice(0, 2).join(' ')}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="billing-table__view-bills"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBillsModalGroup(group);
                          }}
                        >
                          View Bills ({group.billCount})
                        </button>
                      )}
                    </td>
                    <td className="col-money billing-table__cell-money">
                      <div className="billing-table__money-stack">
                        <MoneyAmount amount={group.total} strong />
                        {group.billCount > 1 && (
                          <span className="text-muted">{group.billCount} bills</span>
                        )}
                      </div>
                    </td>
                    <td className={`col-optional col-money billing-table__cell-money ${group.balance > 0 ? 'text-red' : 'text-green'}`}>
                      <MoneyAmount amount={group.balance} strong />
                    </td>
                    <td className="billing-table__cell-status">
                      <StatusBadge status={group.status} />
                    </td>
                    <td className="billing-table__cell-actions">
                      {unpaidBill ? (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBillId(unpaidBill.id);
                            setPaymentModalOpen(true);
                          }}
                        >
                          Collect
                        </Button>
                      ) : (
                        <span className="billing-list__paid-label">Paid</span>
                      )}
                    </td>
                    <td className="billing-table__cell-print">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintGroup(group);
                        }}
                        title="Print billing details"
                      >
                        <Printer size={14} aria-hidden />
                        Print
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!paginatedItems.length && (
                <tr>
                  <td colSpan={7} className="empty-row">No bills found</td>
                </tr>
              )}
            </tbody>
          </table>
        </DataTableShell>
      </div>

      <CollectPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        defaultBillId={selectedBillId}
      />

      <Modal
        isOpen={billsModalGroup != null}
        onClose={() => setBillsModalGroup(null)}
        title={
          billsModalGroup
            ? `Bills — ${billsModalGroup.patientName}${billsModalGroup.patientId ? ` (${billsModalGroup.patientId})` : ''}`
            : 'Bills'
        }
        size="lg"
        overlayClassName="billing-bills-modal-overlay"
        panelClassName="billing-bills-modal"
        footer={
          <Button variant="outline" onClick={() => setBillsModalGroup(null)}>
            Cancel
          </Button>
        }
      >
        {billsModalGroup && (
          <ul className="billing-bills-modal__list">
            {billsModalGroup.bills.map((bill) => (
              <li key={bill.id}>
                <button
                  type="button"
                  className="billing-bills-modal__item"
                  onClick={() => {
                    setBillsModalGroup(null);
                    navigate(`${ROUTES.BILLING}/${bill.id}`);
                  }}
                >
                  <span className="id-badge">{bill.id}</span>
                  <span className="billing-bills-modal__date">
                    {bill.date.split(' ').slice(0, 2).join(' ')}
                  </span>
                  <StatusBadge status={bill.status} />
                  <span className="billing-bills-modal__amount">
                    <MoneyAmount amount={bill.total} strong />
                  </span>
                  {bill.balance > 0 && (
                    <span className="billing-bills-modal__due text-red">
                      Due: <MoneyAmount amount={bill.balance} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <PatientBillsPrintSheet group={printGroup} onClose={() => setPrintGroup(null)} />
    </div>
    </QueryFeedback>
  );
}
