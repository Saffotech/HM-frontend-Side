import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, MoneyAmount, StatusBadge } from '@/shared/components/common';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { OpdBillOutstandingBanner } from './OpdBillExistingBillAlert';

function billRowKey(bill) {
  return String(bill.visitId ?? bill.billNumber ?? bill.id ?? '');
}

function RecentBillRow({ bill, onOpenBill }) {
  const [open, setOpen] = useState(false);
  const billId = bill.billNumber || bill.id;
  const canOpen = Boolean(billId);

  return (
    <li className={`opd-bill-context__recent-item${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="opd-bill-context__recent-row"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="opd-bill-context__recent-date">{bill.date || '—'}</span>
        <span className="opd-bill-context__recent-doc">
          {bill.doctorName || bill.billNumber || 'Bill'}
        </span>
        <span className="opd-bill-context__recent-amt">
          <MoneyAmount amount={bill.total} />
        </span>
        {bill.status ? <StatusBadge status={bill.status} /> : null}
        <ChevronDown
          size={16}
          className={`opd-bill-context__recent-chevron${open ? ' is-open' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="opd-bill-context__recent-dropdown">
          <dl className="opd-bill-context__recent-details">
            {billId ? (
              <div>
                <dt>Bill</dt>
                <dd>{billId}</dd>
              </div>
            ) : null}
            {bill.date ? (
              <div>
                <dt>Date</dt>
                <dd>{bill.date}</dd>
              </div>
            ) : null}
            {bill.doctorName ? (
              <div>
                <dt>Doctor</dt>
                <dd>{bill.doctorName}</dd>
              </div>
            ) : null}
            {bill.deptName ? (
              <div>
                <dt>Department</dt>
                <dd>{bill.deptName}</dd>
              </div>
            ) : null}
            <div>
              <dt>Amount</dt>
              <dd>{formatCurrency(bill.total)}</dd>
            </div>
            {bill.paid != null ? (
              <div>
                <dt>Paid</dt>
                <dd>{formatCurrency(bill.paid)}</dd>
              </div>
            ) : null}
            {Number(bill.balance) > 0.01 ? (
              <div>
                <dt>Balance</dt>
                <dd>{formatCurrency(bill.balance)}</dd>
              </div>
            ) : null}
            {bill.status ? (
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={bill.status} />
                </dd>
              </div>
            ) : null}
          </dl>
          {canOpen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenBill?.(billId)}
            >
              Open Bill
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/**
 * Compact billing context after patient selection — profile + today's bills only.
 */
export default function OpdBillBillingContextPanel({
  billingContext,
  onOpenOutstanding,
  onOpenBill,
}) {
  if (!billingContext) return null;

  const {
    outstanding,
    unpaidTodayCount,
    partialTodayCount,
    recentBills,
  } = billingContext;

  const hasStats =
    unpaidTodayCount > 0 ||
    partialTodayCount > 0 ||
    Number(outstanding) > 0 ||
    (recentBills?.length ?? 0) > 0;

  if (!hasStats) return null;

  const showStatCards =
    unpaidTodayCount > 0 ||
    partialTodayCount > 0 ||
    Number(outstanding) > 0.01;

  return (
    <div className="opd-bill-context">
      <OpdBillOutstandingBanner outstanding={outstanding} onNavigate={onOpenOutstanding} />

      {showStatCards ? (
        <div className="opd-bill-context__stats" aria-label="Billing summary">
          {unpaidTodayCount > 0 ? (
            <div className="opd-bill-context__stat">
              <span className="opd-bill-context__stat-label">Unpaid today</span>
              <strong className="text-danger">{unpaidTodayCount}</strong>
            </div>
          ) : null}
          {partialTodayCount > 0 ? (
            <div className="opd-bill-context__stat">
              <span className="opd-bill-context__stat-label">Partial today</span>
              <strong>{partialTodayCount}</strong>
            </div>
          ) : null}
          {Number(outstanding) > 0.01 ? (
            <div className="opd-bill-context__stat">
              <span className="opd-bill-context__stat-label">Outstanding</span>
              <strong>{formatCurrency(outstanding)}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {recentBills?.length > 0 ? (
        <RecentBillsDropdown recentBills={recentBills} onOpenBill={onOpenBill} />
      ) : null}
    </div>
  );
}

function RecentBillsDropdown({ recentBills, onOpenBill }) {
  const [open, setOpen] = useState(false);
  const count = recentBills.length;

  return (
    <div className={`opd-bill-context__recent${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="opd-bill-context__recent-title"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          Recent bills
          <span className="opd-bill-context__recent-count">{count}</span>
        </span>
        <ChevronDown
          size={16}
          className={`opd-bill-context__recent-section-chevron${open ? ' is-open' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="opd-bill-context__recent-list">
          {recentBills.map((bill) => (
            <RecentBillRow
              key={billRowKey(bill)}
              bill={bill}
              onOpenBill={onOpenBill}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
