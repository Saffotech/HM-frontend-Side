import { useEffect, useState } from 'react';
import { billsApi } from '@/shared/api/services';
import { useQueryToken } from '@/shared/hooks/useQueryToken';
import {
  BrandLogo,
  BrandName,
  MoneyAmount,
} from '@/shared/components/common';
import { APP_NAME } from '@/shared/constants';
import { calcBillTotals, getBillStatus, billItemsWithNonZeroAmount, billLineAmount } from '@/shared/utils/billHelpers';
import '../pages/ViewBillPage.css';
import './PatientBillsPrintSheet.css';

function formatQty(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return String(qty ?? '');
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
    useGrouping: true,
  }).format(n);
}

function BillPrintBlock({ bill, patientPhone, patientAddress }) {
  const lineItems = billItemsWithNonZeroAmount(bill.items);
  const { subtotal, tax, grandTotal } = calcBillTotals(
    lineItems.length ? lineItems : [{ qty: 1, unitPrice: bill.total ?? 0 }]
  );
  const paymentCards = [...(bill.payments || [])].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  const amountPaid = paymentCards.length
    ? paymentCards.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : bill.paid ?? 0;
  const { balance: balanceDue } = getBillStatus(amountPaid, grandTotal || bill.total);
  const stampClass =
    bill.status === 'Paid' ? 'stamp--paid' : bill.status === 'Unpaid' ? 'stamp--unpaid' : 'stamp--partial';
  const stampLabel =
    bill.status === 'Paid' ? 'PAID' : bill.status === 'Unpaid' ? 'UNPAID' : 'PARTIAL PAYMENT';

  return (
    <div className="bill-print-zone patient-bills-print-sheet__bill">
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
          <p className="bill-letterhead__type">Tax Invoice</p>
          <p className="bill-letterhead__id">{bill.id}</p>
          <p>Date: {bill.date}</p>
        </div>
      </div>
      <div className="bill-stripe" />

      <div className="bill-meta-row">
        <div className="bill-meta-col">
          <h4>Billed To</h4>
          <p className="bill-meta-name">{bill.patientName}</p>
          <p>Patient ID: {bill.patientId}</p>
          {patientPhone && <p>{patientPhone}</p>}
          {patientAddress && <p>{patientAddress}</p>}
        </div>
        <div className="bill-meta-col">
          <h4>Service Details</h4>
          {bill.deptName && <p>Department: {bill.deptName}</p>}
          {bill.doctorName && <p>Physician: {bill.doctorName}</p>}
        </div>
        <div className={`bill-stamp ${stampClass}`}>
          <span>{stampLabel}</span>
        </div>
      </div>

      <div className="bill-items-section">
        <h4>Bill Items</h4>
        <table className="bill-items-table">
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
            {lineItems.length ? (
              lineItems.map((item, idx) => (
                <tr
                  key={item.id ?? `${item.name ?? 'line'}-${item.qty}-${item.unitPrice}`}
                  className={idx % 2 ? 'row-alt' : ''}
                >
                  <td>{idx + 1}</td>
                  <td>{item.name}</td>
                  <td className="text-center">{formatQty(item.qty)}</td>
                  <td className="col-money">
                    <MoneyAmount amount={item.unitPrice} printCompact />
                  </td>
                  <td className="col-money">
                    <MoneyAmount amount={billLineAmount(item)} strong printCompact />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td>1</td>
                <td>OPD Services</td>
                <td className="text-center">1</td>
                <td className="col-money">
                  <MoneyAmount amount={bill.total} printCompact />
                </td>
                <td className="col-money">
                  <MoneyAmount amount={bill.total} strong printCompact />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bill-footer-grid">
        {paymentCards.length > 0 && (
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
                {paymentCards.map((p) => (
                  <tr key={p.id ?? `${p.date}-${p.mode}-${p.amount}-${p.ref ?? ''}`}>
                    <td>{p.date}</td>
                    <td>
                      <span className="mode-tag">{p.mode}</span>
                    </td>
                    <td className="col-money bill-payment-table__amount">
                      <MoneyAmount amount={p.amount} strong printCompact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="bill-footer-summary">
          <h4>Summary</h4>
          <table className="bill-footer-table bill-summary-table">
            <thead>
              <tr>
                <th>Subtotal</th>
                <th>Tax (5% GST)</th>
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
                  <MoneyAmount amount={grandTotal || bill.total} strong printCompact />
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
        {['Patient / Guardian', 'Cashier / Billing Staff', 'Authorised Signatory'].map((label) => (
          <div key={label}>
            <div className="sig-line" />
            <p>{label}</p>
          </div>
        ))}
      </div>
      <footer className="bill-invoice-footer">
        <p>Computer-generated invoice. No physical stamp required.</p>
        <p>Thank you for choosing {APP_NAME}</p>
      </footer>
    </div>
  );
}

export default function PatientBillsPrintSheet({ group, onClose }) {
  const token = useQueryToken();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!group) return undefined;
    document.body.classList.add('billing-print-active');
    return () => document.body.classList.remove('billing-print-active');
  }, [group]);

  useEffect(() => {
    if (!group) {
      setInvoices([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const rows = await Promise.all(
        group.bills.map(async (stub) => {
          if (!stub.visitId) return stub;
          try {
            return await billsApi.getBillInvoice(stub.visitId, token);
          } catch {
            return stub;
          }
        })
      );
      if (!cancelled) {
        setInvoices(rows.filter(Boolean));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [group, token]);

  useEffect(() => {
    if (!group || loading || !invoices.length) return undefined;

    const handleAfterPrint = () => onClose?.();
    window.addEventListener('afterprint', handleAfterPrint, { once: true });

    const timer = setTimeout(() => window.print(), 400);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [group, loading, invoices, onClose]);

  if (!group || loading || !invoices.length) return null;

  const patientPhone = invoices[0]?.patientPhone;
  const patientAddress = invoices[0]?.patientAddress;

  return (
    <div className="patient-bills-print-sheet" aria-hidden="true">
      {group.billCount > 1 && (
        <div className="patient-bills-print-sheet__cover bill-print-zone">
          <h2>Billing Summary — {group.patientName}</h2>
          <p>Patient ID: {group.patientId}</p>
          <p>
            Total bills: {group.billCount} · Grand total:{' '}
            <MoneyAmount amount={group.total} strong printCompact />
          </p>
        </div>
      )}
      {invoices.map((bill) => (
        <BillPrintBlock
          key={bill.id ?? bill.visitId}
          bill={bill}
          patientPhone={patientPhone}
          patientAddress={patientAddress}
        />
      ))}
    </div>
  );
}
