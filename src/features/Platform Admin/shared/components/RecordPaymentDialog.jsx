import { useState } from "react";
import { recordInvoicePayment } from "../api/invoiceApi";
import { paymentRequestBody } from "../api/invoiceModel";
import { interpretPlatformError } from "../api/platformErrors";
import { todayInput } from "../utils/formatDate";
import { formatCurrency } from "../utils/formatCurrency";
import { PAYMENT_METHODS, paymentErrors } from "../utils/invoices";
import Button from "./Button";
import Input from "./Input";
import Modal from "./Modal";

const FIELD_MAP = { paid_at: "paidAt" };

export default function RecordPaymentDialog({ invoice, onClose, onRecorded }) {
  const today = todayInput();
  const [form, setForm] = useState({
    amount: invoice?.amount ?? "",
    method: "",
    reference: "",
    paidAt: today,
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    const next = paymentErrors(form);
    if (Number(form.amount) !== Number(invoice.amount) || !Number.isInteger(Number(form.amount))) {
      next.amount = "Enter the full invoice amount in whole rupees.";
    }
    if (form.paidAt && form.paidAt > today) next.paidAt = "Payment date cannot be in the future.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      const saved = await recordInvoicePayment(invoice.id, paymentRequestBody(form));
      onRecorded(saved);
    } catch (err) {
      const result = interpretPlatformError(err, FIELD_MAP);
      setErrors(Object.keys(result.fieldErrors).length ? result.fieldErrors : { form: result.toast });
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open
      title={`Record payment · ${invoice.number || "Invoice"}`}
      subtitle={`${invoice.hospitalName || "Hospital"} · ${formatCurrency(invoice.amount)}`}
      onClose={pending ? () => {} : onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" form="record-platform-payment" disabled={pending}>{pending ? "Saving…" : "Record payment"}</Button>
        </>
      )}
    >
      <form id="record-platform-payment" onSubmit={submit}>
        {errors.form && <p role="alert">{errors.form}</p>}
        <Input label="Amount" type="number" min="1" step="1" value={form.amount} onChange={set("amount")} error={errors.amount} required />
        <label className={`field ${errors.method ? "has-error" : ""}`}>
          <span className="field-label">Method</span>
          <select value={form.method} onChange={set("method")} required>
            <option value="">Choose</option>
            {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
          {errors.method && <span className="field-error">{errors.method}</span>}
        </label>
        <Input
          label={form.method === "UPI" ? "UPI ID" : "Reference"}
          value={form.reference}
          onChange={set("reference")}
          error={errors.reference}
          maxLength={100}
          placeholder={form.method === "UPI" ? "name@bank" : undefined}
        />
        <Input label="Paid on" type="date" max={today} value={form.paidAt} onChange={set("paidAt")} error={errors.paidAt} required />
        <Input label="Notes" as="textarea" value={form.notes} onChange={set("notes")} error={errors.notes} maxLength={2000} />
      </form>
    </Modal>
  );
}
