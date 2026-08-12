/**
 * Standard IPD tax invoice layout — shared by view-bill and bill-preview print.
 */

import { BrandLogo, BrandName, MoneyAmount } from '@/shared/components/common';
import { APP_NAME } from '@/shared/constants';

function formatQty(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return String(qty ?? '');
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
    useGrouping: true,
  }).format(n);
}

function titleCaseMode(mode) {
  const key = String(mode || '').toLowerCase();
  if (key === 'upi') return 'UPI';
  if (!key) return '—';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function resolveStamp(summary = {}) {
  const statusKey = String(summary.payment_status || '').toLowerCase();
  const statusUi =
    statusKey === 'paid' ? 'Paid' : statusKey === 'partial' ? 'Partial' : 'Unpaid';
  const stampClass =
    statusUi === 'Paid' ? 'stamp--paid' : statusUi === 'Unpaid' ? 'stamp--unpaid' : 'stamp--partial';
  const stampLabel =
    statusUi === 'Paid' ? 'PAID' : statusUi === 'Unpaid' ? 'UNPAID' : 'PARTIAL PAYMENT';
  return { stampClass, stampLabel };
}

export default function IpdBillPrintSheet({ invoice, className = '' }) {
  if (!invoice) return null;

  const summary = invoice.summary ?? {};
  const patient = invoice.patient ?? {};
  const service = invoice.service ?? {};
  const items = invoice.bill_items ?? [];
  const payments = invoice.payment_history ?? [];
  const { stampClass, stampLabel } = resolveStamp(summary);

  const subtotal = Number(summary.subtotal ?? 0);
  const tax = Number(summary.gst_amount ?? 0);
  const grandTotal = Number(summary.grand_total ?? 0);
  const amountPaid = Number(summary.amount_paid ?? 0);
  const balanceDue = Number(summary.balance_due ?? 0);
  const taxLabel = summary.gst_label || 'Tax (GST)';

  return (
    <div className={`bill-print-zone${className ? ` ${className}` : ''}`}>
      <div className="bill-letterhead" role="banner">
        <div className="bill-letterhead__brand">
          <h1 className="bill-letterhead__title">
            <BrandLogo size={36} className="bill-letterhead__logo" />
            <BrandName className="bill-letterhead__brand-name" />
          </h1>
          <p>123 Health Avenue, Medical District, Mumbai — 400001</p>
          <p>Tel: +91 800 123 4567 | billing@saffocare.com | GSTIN: 27AABCM1234A1Z5</p>
        </div>
        <div className="bill-letterhead__meta">
          <p className="bill-letterhead__type">IPD Tax Invoice</p>
          <p className="bill-letterhead__id">{invoice.bill_number || '—'}</p>
          <p>Date: {invoice.bill_date || '—'}</p>
        </div>
      </div>
      <div className="bill-stripe" />

      <div className="bill-meta-row">
        <div className="bill-meta-col">
          <h4>Billed To</h4>
          <p className="bill-meta-name">{patient.name || '—'}</p>
          <p>Patient ID: {patient.patient_uid || '—'}</p>
          {patient.phone ? <p>{patient.phone}</p> : null}
          {patient.address ? <p>{patient.address}</p> : null}
        </div>
        <div className="bill-meta-col">
          <h4>Admission Details</h4>
          <p>Admission: {invoice.admission_no || service.admission_no || '—'}</p>
          <p>Department: {service.department || 'IPD'}</p>
          <p>Physician: {service.doctor || 'N/A'}</p>
          {service.ward ? <p>Ward: {service.ward}</p> : null}
          {service.bed ? <p>Bed: {service.bed}</p> : null}
        </div>
        <div className={`bill-stamp ${stampClass}`}>
          <span>{stampLabel}</span>
        </div>
      </div>

      <div className="bill-items-section">
        <h4>Bill Items</h4>
        <table className="bill-items-table">
          <colgroup>
            <col className="col-num" />
            <col className="col-desc" />
            <col className="col-qty" />
            <col className="col-unit" />
            <col className="col-amt" />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>Qty</th>
              <th className="col-money">Unit Price</th>
              <th className="col-money">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`${item.description}-${idx}`} className={idx % 2 ? 'row-alt' : ''}>
                <td>{idx + 1}</td>
                <td>{item.description}</td>
                <td className="text-center">{formatQty(item.qty)}</td>
                <td className="col-money">
                  <MoneyAmount amount={item.unit_price} printCompact />
                </td>
                <td className="col-money">
                  <MoneyAmount amount={item.amount} strong printCompact />
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-row">
                  No bill items
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="bill-footer-grid">
        {payments.length > 0 ? (
          <div className="bill-footer-payments">
            <h4>Payment History</h4>
            <table className="bill-footer-table bill-payment-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th className="col-money">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => (
                  <tr key={`${p.date}-${p.mode}-${idx}`}>
                    <td>{p.date || '—'}</td>
                    <td>
                      <span className="mode-tag">{titleCaseMode(p.mode)}</span>
                    </td>
                    <td className="col-money bill-payment-table__amount">
                      <MoneyAmount amount={p.amount} strong printCompact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="bill-footer-summary">
          <h4>Summary</h4>
          <table className="bill-footer-table bill-summary-table">
            <thead>
              <tr>
                <th>Subtotal</th>
                <th>{taxLabel}</th>
                <th>Grand Total</th>
                <th>Amount Paid</th>
                <th>Balance Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-money">
                  <MoneyAmount amount={subtotal} printCompact />
                </td>
                <td className="col-money">
                  <MoneyAmount amount={tax} printCompact />
                </td>
                <td className="col-money bill-summary-table__total">
                  <MoneyAmount amount={grandTotal} strong printCompact />
                </td>
                <td className="col-money bill-summary-table__paid">
                  <MoneyAmount amount={amountPaid} printCompact />
                </td>
                <td
                  className={`col-money bill-summary-table__due${
                    balanceDue > 0 ? ' bill-summary-table__due--red' : ''
                  }`}
                >
                  <MoneyAmount amount={balanceDue} strong printCompact />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bill-signatures">
        {['Patient / Guardian', 'Cashier / Billing Staff', 'Authorised Signatory'].map(
          (label) => (
            <div key={label}>
              <div className="sig-line" />
              <p>{label}</p>
            </div>
          ),
        )}
      </div>
      <footer className="bill-invoice-footer">
        <p>Computer-generated invoice. No physical stamp required.</p>
        <p>Thank you for choosing {APP_NAME}</p>
      </footer>
    </div>
  );
}
