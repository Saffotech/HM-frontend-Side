import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, CreditCard } from 'lucide-react';
import {
  useBillsQuery,
  useBillInvoiceQuery,
  useDeleteBillMutation,
} from '@/shared/hooks/queries/useBillingQuery';
import { usePatientQuery } from '@/shared/hooks/queries/usePatientQuery';
import { asBillList } from '@/shared/hooks/queries/listDataUtils';
import { useDepartmentsQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import { opdReferenceApi } from '@/shared/api/services';
import {
  BrandLogo,
  BrandName,
  Button,
  QueryFeedback,
  ConfirmDialog,
  MoneyAmount,
} from '@/shared/components/common';
import CollectPaymentModal from '@/features/opd/billing/components/CollectPaymentModal';
import { calcBillTotals, getBillStatus, billItemsWithNonZeroAmount, billLineAmount } from '@/shared/utils/billHelpers';
import { APP_NAME, ROUTES } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import './ViewBillPage.css';

function formatQty(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return String(qty ?? '');
  const abs = Math.abs(n);
  // If the number is absurdly large, avoid scientific notation and giant strings.
  if (abs >= 1e9) {
    const exp = Math.floor(Math.log10(abs));
    const mantissa = abs / 10 ** exp;
    const m = String(mantissa.toFixed(mantissa >= 10 ? 1 : 2)).replace(/\.?0+$/, '');
    return `${n < 0 ? '-' : ''}${m}×10^${exp}`;
  }
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
    useGrouping: true,
  }).format(n);
}

export default function ViewBillPage() {
  const { id } = useParams();
  const { data: billsData, isLoading: lb, isError: eb, error: errB } = useBillsQuery({
    fetchAll: false,
    search: id,
    page: 1,
    limit: 20,
  });
  const bills = asBillList(billsData);
  const billStub = useMemo(() => bills.find((b) => b.id === id), [bills, id]);
  const visitId = billStub?.visitId;
  const {
    data: billInvoice,
    isLoading: li,
    isError: ei,
    error: errI,
  } = useBillInvoiceQuery(visitId, { enabled: Boolean(visitId) });
  const bill = billInvoice ?? billStub;
  const { data: patient, isLoading: lp, isError: ep, error: errP } = usePatientQuery(
    bill?.patientId
  );
  const { data: departments = [] } = useDepartmentsQuery();
  const navigate = useNavigate();
  const deleteBill = useDeleteBillMutation();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isLoading = lb || lp || (Boolean(visitId) && li);
  const isError = eb || ep || ei;
  const error = errB || errP || errI;
  if (isLoading || isError) {
    return <QueryFeedback isLoading={isLoading} isError={isError} error={error} />;
  }

  if (!bill) return <div className="empty-state">Bill not found</div>;
  const dept =
    opdReferenceApi.findDepartment(departments, bill.deptId || patient?.deptId) ??
    (bill.deptName ? { name: bill.deptName } : null);
  const docName =
    bill.doctorName ??
    (bill.doctorId ? `Doctor #${bill.doctorId}` : patient?.doctorId ? `Doctor #${patient.doctorId}` : null);
  const displayItems = billItemsWithNonZeroAmount(bill.items);
  const { subtotal, tax, grandTotal } = calcBillTotals(
    displayItems.length ? displayItems : [{ qty: 1, unitPrice: bill.total ?? 0 }]
  );

  const paymentCards = [...(bill.payments || [])].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  const amountPaid = paymentCards.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const { balance: balanceDue } = getBillStatus(amountPaid, grandTotal);

  const stampClass =
    bill.status === 'Paid' ? 'stamp--paid' : bill.status === 'Unpaid' ? 'stamp--unpaid' : 'stamp--partial';
  const stampLabel = bill.status === 'Paid' ? 'PAID' : bill.status === 'Unpaid' ? 'UNPAID' : 'PARTIAL PAYMENT';
  const canDeleteBill = Boolean(bill.visitId) && amountPaid <= 0 && bill.status === 'Unpaid';

  return (
    <div className="view-bill page-container">
      <div className="view-bill__actions no-print">
        <div className="view-bill__actions-left">
          <Link to={ROUTES.BILLING}><Button variant="outline" size="sm"><ArrowLeft size={16} /> Back</Button></Link>
          <h2>Bill Details — {bill.id}</h2>
        </div>
        <div className="view-bill__actions-right">
          {(bill.status === 'Unpaid' || bill.status === 'Partial') && (
            <Button variant="success" onClick={() => setPaymentModalOpen(true)}><CreditCard size={16} /> Collect Payment</Button>
          )}
          <Button variant="outline" onClick={() => window.print()}><Printer size={16} /> Print</Button>
          {canDeleteBill && (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete Bill</Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteOpen}
        message={`Delete bill ${bill.id} for ${bill.patientName}? This cannot be undone.`}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (!bill.visitId) {
            toast.error('Cannot delete bill: visit id is missing');
            setDeleteOpen(false);
            return;
          }
          deleteBill.mutate(bill.visitId, {
            onSuccess: () => {
              toast.success('Bill deleted');
              navigate(ROUTES.BILLING);
            },
          });
        }}
      />

      <div className="bill-print-zone">
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
            {patient?.phone && <p>{patient.phone}</p>}
            {patient?.address && <p>{patient.address}</p>}
          </div>
          <div className="bill-meta-col">
            <h4>Service Details</h4>
            {bill.visitType && <p>Visit: {bill.visitType}</p>}
            {bill.appointmentId && <p>Appointment: {bill.appointmentId}</p>}
            <p>Department: {bill.deptName || dept?.name || 'General'}</p>
            <p>Physician: {docName ?? 'N/A'}</p>
            {bill.notes && <p className="bill-notes">Notes: {bill.notes}</p>}
          </div>
          <div className={`bill-stamp ${stampClass}`}><span>{stampLabel}</span></div>
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
            <thead><tr><th>#</th><th>Description</th><th>Qty</th><th className="col-money">Unit Price</th><th className="col-money">Amount</th></tr></thead>
            <tbody>
              {displayItems.map((item, idx) => (
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
              ))}
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
                      <td><span className="mode-tag">{p.mode}</span></td>
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
          {['Patient / Guardian', 'Cashier / Billing Staff', 'Authorised Signatory'].map((label) => (
            <div key={label}><div className="sig-line" /><p>{label}</p></div>
          ))}
        </div>
        <footer className="bill-invoice-footer">
          <p>Computer-generated invoice. No physical stamp required.</p>
          <p>Thank you for choosing {APP_NAME}</p>
        </footer>
      </div>

      <CollectPaymentModal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} defaultBillId={bill.id} />
    </div>
  );
}
