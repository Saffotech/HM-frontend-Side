import { useState } from "react";
import { usePlatform } from "../../../shared/context/PlatformContext";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import Modal from "../../../shared/components/Modal";
import Select from "../../../shared/components/Select";
import { useToast } from "../../../shared/hooks/useToast";
import { daysUntil, formatDate, todayInput } from "../../../shared/utils/formatDate";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import { PAYMENT_METHODS, billingFor, collectedThisMonth, compareCollections, isUnpaid, paymentErrors } from "../../../shared/utils/invoices";
import "../Accountant.css";

export default function Collections() {
  const { invoices, hospitals, recordInvoicePayment, sendInvoiceReminder } = usePlatform();
  const { push } = useToast();
  const [viewId, setViewId] = useState(null);
  const [payId, setPayId] = useState(null);
  const [card, setCard] = useState("outstanding");
  const today = todayInput();
  const unpaid = invoices.filter(isUnpaid).sort(compareCollections);
  const dueToday = unpaid.filter((invoice) => invoice.dueDate === today);
  const overdue = unpaid.filter((invoice) => invoice.status === "Overdue" || invoice.dueDate < today);
  const collected = collectedThisMonth(invoices)
    .sort((a, b) => String(b.paidAt || b.invoiceDate).localeCompare(String(a.paidAt || a.invoiceDate)));
  const sum = (list) => list.reduce((total, item) => total + item.amount, 0);
  const bill = (invoice) => billingFor(invoice, hospitals);
  const viewing = invoices.find((item) => item.id === viewId) || null;
  const paying = invoices.find((item) => item.id === payId) || null;
  const cards = {
    outstanding: { rows: unpaid, title: "Collection queue", empty: ["You're all caught up.", "No outstanding payments require attention."] },
    today: { rows: dueToday, title: "Due today", empty: ["Nothing due today.", "No unpaid invoices are due today."] },
    overdue: { rows: overdue, title: "Overdue invoices", empty: ["No overdue invoices.", "Every unpaid invoice is still within its due date."] },
    collected: { rows: collected, title: "Collected this month", empty: ["No payments yet this month.", "Invoices marked paid this month will appear here."] },
  };
  const active = cards[card];
  const showingPaid = card === "collected";

  const remind = (invoice) => {
    sendInvoiceReminder(invoice.id);
    push("Payment reminder sent.", "success");
  };

  const stat = (key, label, list, hint) => (
    <Stat tone={key} label={label} value={formatCurrency(sum(list))} hint={hint} active={card === key} onClick={() => setCard(key)} />
  );

  return (
    <section className="portal-page accounts-home">
      <div className="portal-stats accounts-stats" role="group" aria-label="Filter the queue">
        {stat("outstanding", "Outstanding", unpaid, `${unpaid.length} unpaid subscription invoice${unpaid.length === 1 ? "" : "s"}`)}
        {stat("today", "Due today", dueToday, `${dueToday.length} unpaid invoice${dueToday.length === 1 ? "" : "s"} due today`)}
        {stat("overdue", "Overdue", overdue, `${overdue.length} unpaid invoice${overdue.length === 1 ? "" : "s"} past due date`)}
        {stat("collected", "Collected this month", collected, `${collected.length} invoice${collected.length === 1 ? "" : "s"} marked paid this month`)}
      </div>

      <section className="card card-pad">
        <header className="portal-head">
          <div>
            <h2>{active.title}</h2>
          </div>
          <span className="accounts-count">{active.rows.length} invoice{active.rows.length === 1 ? "" : "s"} · {formatCurrency(sum(active.rows))}</span>
        </header>
        {active.rows.length === 0 ? (
          <div className="accounts-empty">
            <strong>{active.empty[0]}</strong>
            <span>{active.empty[1]}</span>
          </div>
        ) : (
          <div className="portal-table-wrap">
            <table className="portal-table accounts-queue">
              <thead>
                <tr>
                  {["Hospital", "Invoice", "Subscription", "Amount", showingPaid ? "Paid on" : "Due date", "Status", "Action"].map((column) => (
                    <th key={column} scope="col">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.rows.map((invoice) => {
                  const subscription = bill(invoice);
                  const days = daysUntil(invoice.dueDate);
                  const tone = showingPaid ? "" : invoice.status === "Overdue" || days < 0 ? "is-overdue" : days === 0 ? "is-today" : "";
                  return (
                  <tr key={invoice.id} className={tone}>
                    <td><strong>{subscription.hospitalName}</strong></td>
                    <td className="accounts-invoice">{invoice.number}</td>
                    <td>{subscription.plan}<span>{subscription.cycle} · {subscription.subscriptionStatus}</span></td>
                    <td className="accounts-amount">{formatCurrency(invoice.amount)}</td>
                    <td className={tone}>{showingPaid ? formatDate(invoice.paidAt || invoice.invoiceDate) : dueLabel(invoice)}</td>
                    <td><PayStatus status={invoice.status} /></td>
                    <td>
                      <div className="accounts-actions">
                        <button type="button" onClick={() => setViewId(invoice.id)}>View</button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InvoiceDetail
        invoice={viewing}
        subscription={viewing ? bill(viewing) : null}
        onClose={() => setViewId(null)}
        onPay={() => { setViewId(null); setPayId(viewing.id); }}
        onRemind={() => remind(viewing)}
      />
      <PaymentForm
        invoice={paying}
        subscription={paying ? bill(paying) : null}
        onClose={() => setPayId(null)}
        onSave={(input) => {
          recordInvoicePayment(paying.id, input);
          push(`Payment recorded for ${paying.number}.`, "success");
          setPayId(null);
        }}
      />
    </section>
  );
}

function Stat({ tone, label, value, hint, active, onClick }) {
  return (
    <button
      type="button"
      className={`card portal-stat accounts-stat accounts-stat-${tone}${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </button>
  );
}

function dueLabel(invoice) {
  const days = daysUntil(invoice.dueDate);
  if (days === 0) return "Today";
  return formatDate(invoice.dueDate);
}

function PayStatus({ status }) {
  const tone = status.toLowerCase();
  return <span className={`accounts-chip accounts-chip-${tone}`}>{status}</span>;
}

function InvoiceDetail({ invoice, subscription, onClose, onPay, onRemind }) {
  if (!invoice || !subscription) return null;
  const paid = invoice.status === "Paid";
  return (
    <Modal
      open
      title={invoice.number}
      subtitle={subscription.hospitalName}
      onClose={onClose}
      footer={paid ? <Button variant="secondary" onClick={onClose}>Close</Button> : (
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {invoice.status !== "Failed" && <Button variant="secondary" onClick={onRemind}>Send reminder</Button>}
          <Button onClick={onPay}>{invoice.status === "Failed" ? "Retry" : "Record payment"}</Button>
        </>
      )}
    >
      <h3 className="accounts-section">Billing information</h3>
      <dl className="accounts-detail">
        <div><dt>Plan</dt><dd>{subscription.plan}</dd></div>
        <div><dt>Billing cycle</dt><dd>{subscription.cycle}</dd></div>
        <div><dt>Subscription status</dt><dd>{subscription.subscriptionStatus}</dd></div>
      </dl>
      <h3 className="accounts-section">Invoice information</h3>
      <dl className="accounts-detail">
        <div><dt>Amount</dt><dd>{formatCurrency(invoice.amount)}</dd></div>
        <div><dt>Issued</dt><dd>{formatDate(invoice.invoiceDate)}</dd></div>
        <div><dt>Due</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
        <div><dt>Status</dt><dd><PayStatus status={invoice.status} /></dd></div>
      </dl>
      <h3 className="accounts-section">Payment</h3>
      {paid ? (
        <p className="accounts-note">
          {formatCurrency(invoice.paymentAmount || invoice.amount)} · {invoice.method}
          {invoice.reference ? ` · Reference: ${invoice.reference}` : ""}
          {invoice.paidAt ? ` · Paid on ${formatDate(invoice.paidAt)}` : ""}
          {invoice.recordedBy ? ` · Recorded by ${invoice.recordedBy}` : ""}
        </p>
      ) : (
        <p className="accounts-note">No payment received.</p>
      )}
      {(invoice.reminders || []).length > 0 && (
        <p className="accounts-note">Last reminder {formatDate(invoice.reminders[invoice.reminders.length - 1].at)} · {invoice.reminders[invoice.reminders.length - 1].by}</p>
      )}
    </Modal>
  );
}

function PaymentForm({ invoice, subscription, onClose, onSave }) {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const current = form && form.id === invoice?.id
    ? form
    : invoice
      ? { id: invoice.id, amount: String(invoice.amount), method: invoice.method || PAYMENT_METHODS[0], reference: "", paidAt: todayInput(), notes: "" }
      : null;

  if (!invoice || !current) return null;

  const set = (key) => (event) => {
    setForm({ ...current, [key]: event.target.value });
    setErrors((existing) => ({ ...existing, [key]: "" }));
  };

  const save = () => {
    const next = paymentErrors(current);
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({
      amount: Number(current.amount),
      method: current.method,
      reference: current.reference.trim(),
      paidAt: current.paidAt,
      notes: current.notes.trim(),
    });
  };

  return (
    <Modal
      open
      title="Record payment"
      subtitle={`${invoice.number} · ${subscription?.hospitalName || "Customer"}`}
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Record payment</Button></>}
    >
      <dl className="accounts-detail">
        <div><dt>Hospital</dt><dd>{subscription?.hospitalName}</dd></div>
        <div><dt>Invoice</dt><dd>{invoice.number}</dd></div>
        <div><dt>Amount due</dt><dd>{formatCurrency(invoice.amount)}</dd></div>
        <div><dt>Due date</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
      </dl>
      <div className="accounts-form">
        <Input label="Payment amount *" type="number" min="1" value={current.amount} error={errors.amount} onChange={set("amount")} />
        <Select label="Payment method *" value={current.method} error={errors.method} onChange={set("method")}>
          {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
        </Select>
        <Input label={current.method === "Card" ? "Payment reference" : "Payment reference *"} value={current.reference} error={errors.reference} onChange={set("reference")} />
        <Input label="Payment date *" type="date" value={current.paidAt} max={todayInput()} error={errors.paidAt} onChange={set("paidAt")} />
        <Input className="accounts-span" label="Notes" value={current.notes} onChange={set("notes")} />
      </div>
    </Modal>
  );
}
