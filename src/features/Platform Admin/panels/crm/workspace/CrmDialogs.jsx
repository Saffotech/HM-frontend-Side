import { useState } from "react";
import Button from "../../../shared/components/Button";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import Input from "../../../shared/components/Input";
import Modal from "../../../shared/components/Modal";
import PhoneInput from "../../../shared/components/PhoneInput";
import Select from "../../../shared/components/Select";
import { DEFAULT_PHONE_CODE, formatPhoneDisplay, parsePhoneNumber, validPhoneForCode } from "../../../shared/utils/phoneNumbers";
import { CLOSE_REASONS, CONTACT_METHODS, billingCycles, hospitalTypes } from "../../../shared/data/catalog";
import { formatDate } from "../../../shared/utils/formatDate";
import { isEmail, required } from "../../../shared/utils/validation";
import { CONTACT_OUTCOMES, OUTCOME_TONE, LEAD_SOURCES, PRIORITIES } from "../utils/crmLeads";

const dueLabel = (day) => formatDate(`${day}T00:00:00`);

export function ContactDialog({ lead, mode, today, onCancel, onSubmit, initialOutcome = "" }) {
  const completing = mode === "complete";
  const startingOutcome = CONTACT_OUTCOMES.some(([value]) => value === initialOutcome) ? initialOutcome : "";
  const outcomes = startingOutcome
    ? CONTACT_OUTCOMES.filter(([value]) => value === startingOutcome)
    : CONTACT_OUTCOMES;
  const [form, setForm] = useState({
    method: CONTACT_METHODS[0],
    outcome: startingOutcome,
    note: "",
    followUpDate: "",
    nextAction: "",
    reason: CLOSE_REASONS[0],
  });
  const [errors, setErrors] = useState({});
  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const chooseOutcome = (outcome) => {
    setForm((current) => ({ ...current, outcome }));
    setErrors((current) => ({ ...current, outcome: "" }));
  };
  const needsDate = form.outcome === "interested" || form.outcome === "callback";

  const submit = () => {
    const next = {};
    if (!form.outcome) next.outcome = "Choose the outcome of this contact.";
    if (!form.note.trim()) next.note = "Write what was discussed.";
    if (needsDate && !form.followUpDate) next.followUpDate = "Choose the next follow-up date.";
    if (needsDate && form.followUpDate && form.followUpDate < today) next.followUpDate = "The follow-up date can't be in the past.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ ...form, note: form.note.trim(), nextAction: form.nextAction.trim() });
  };

  return (
    <Modal
      open
      title={completing ? "Complete follow-up" : "Log contact"}
      subtitle={`${lead.hospitalName} · ${lead.contactPerson}${lead.contactPhone ? ` · ${formatPhoneDisplay(lead.contactPhone)}` : ""}`}
      onClose={onCancel}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={form.outcome === "not-interested" ? "danger" : "primary"} onClick={submit}>
            {form.outcome === "not-interested" ? "Save and close lead" : form.outcome === "agreed" ? "Save and continue" : completing ? "Complete follow-up" : "Save contact"}
          </Button>
        </>
      )}
    >
      {lead.followUpDate && (
        <p className="crm-callout">
          {completing ? "Completing" : "Logging a contact completes"} the follow-up due <strong>{dueLabel(lead.followUpDate)}</strong>
          {lead.nextAction ? <> — {lead.nextAction}</> : null}.
        </p>
      )}
      <div className="crm-form">
        <Select label="Contact method *" value={form.method} onChange={set("method")}>
          {CONTACT_METHODS.map((method) => <option key={method}>{method}</option>)}
        </Select>
        <fieldset className={`crm-span crm-outcomes${errors.outcome ? " has-error" : ""}`}>
          <legend>Outcome *</legend>
          <div className="crm-outcome-list" role="radiogroup" aria-label="Outcome">
            {outcomes.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={form.outcome === value}
                className={`crm-outcome ${OUTCOME_TONE[value] || ""}${form.outcome === value ? " is-on" : ""}`}
                onClick={() => chooseOutcome(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {errors.outcome ? <p className="field-error">{errors.outcome}</p> : null}
        </fieldset>
        <Input as="textarea" rows={3} className="crm-span" label="Notes *" value={form.note} error={errors.note} onChange={set("note")} placeholder="What was discussed?" />
        {needsDate && (
          <>
            <Input type="date" label="Next follow-up *" min={today} value={form.followUpDate} error={errors.followUpDate} onChange={set("followUpDate")} />
            <Input label="Next action" value={form.nextAction} onChange={set("nextAction")} placeholder="e.g. Share the quotation" />
          </>
        )}
        {form.outcome === "not-interested" && (
          <Select className="crm-span" label="Reason *" value={form.reason} onChange={set("reason")}>
            {CLOSE_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
          </Select>
        )}
        {form.outcome === "agreed" && (
          <p className="crm-span crm-hint">After saving, confirm the agreed plan to hand the lead over to Accounts for registration.</p>
        )}
      </div>
    </Modal>
  );
}

export function ScheduleDialog({ lead, today, onCancel, onSubmit }) {
  const rescheduling = Boolean(lead.followUpDate);
  const [form, setForm] = useState({ followUpDate: lead.followUpDate >= today ? lead.followUpDate : "", nextAction: lead.nextAction || "", note: "" });
  const [error, setError] = useState("");
  const submit = () => {
    if (!form.followUpDate) return setError("Choose a follow-up date.");
    if (form.followUpDate < today) return setError("The follow-up date can't be in the past.");
    if (form.followUpDate === lead.followUpDate && form.nextAction.trim() === (lead.nextAction || "")) return setError("Pick a different date or next action.");
    onSubmit({ followUpDate: form.followUpDate, nextAction: form.nextAction.trim(), note: form.note.trim() });
    return undefined;
  };
  return (
    <Modal
      open
      title={rescheduling ? "Reschedule follow-up" : "Schedule follow-up"}
      subtitle={`${lead.hospitalName} · ${lead.contactPerson}`}
      onClose={onCancel}
      footer={<><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button onClick={submit}>{rescheduling ? "Reschedule" : "Schedule"}</Button></>}
    >
      {rescheduling && <p className="crm-callout">Currently due <strong>{dueLabel(lead.followUpDate)}</strong>. The change is recorded in the lead history.</p>}
      <div className="crm-form">
        <Input type="date" label="Follow-up date *" min={today} value={form.followUpDate} error={error} onChange={(event) => { setForm({ ...form, followUpDate: event.target.value }); setError(""); }} />
        <Input label="Next action" value={form.nextAction} onChange={(event) => { setForm({ ...form, nextAction: event.target.value }); setError(""); }} placeholder="e.g. Book a demo" />
        <Input as="textarea" rows={2} className="crm-span" label={rescheduling ? "Reason for rescheduling" : "Note"} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
      </div>
    </Modal>
  );
}

export function AgreeDialog({ lead, planOptions, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    plan: planOptions.includes(lead.plan) ? lead.plan : planOptions[0] || "",
    billingCycle: billingCycles.includes(lead.billingCycle) ? lead.billingCycle : billingCycles[0],
    hospitalEmail: lead.hospitalEmail || "",
    note: "",
  });
  const [emailError, setEmailError] = useState("");
  const send = () => {
    const hospitalEmail = form.hospitalEmail.trim();
    if (!isEmail(hospitalEmail)) {
      setEmailError("Enter a valid hospital email.");
      return;
    }
    onSubmit({ ...form, hospitalEmail, note: form.note.trim() });
  };
  return (
    <Modal
      open
      title="Hospital agreed to register"
      subtitle={`${lead.hospitalName} · ${lead.contactPerson}`}
      onClose={onCancel}
      footer={<><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button disabled={!form.plan} onClick={send}>Send to Accounts</Button></>}
    >
      <p className="crm-callout crm-callout-purple">Accounts registers the hospital and sets up billing. You can follow the registration from My Conversions.</p>
      <div className="crm-form">
        <Select label="Agreed plan *" value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })}>
          {planOptions.map((plan) => <option key={plan}>{plan}</option>)}
        </Select>
        <Select label="Billing cycle *" value={form.billingCycle} onChange={(event) => setForm({ ...form, billingCycle: event.target.value })}>
          {billingCycles.map((cycle) => <option key={cycle}>{cycle}</option>)}
        </Select>
        <Input className="crm-span" label="Hospital email *" type="email" value={form.hospitalEmail} error={emailError} onChange={(event) => { setForm({ ...form, hospitalEmail: event.target.value }); setEmailError(""); }} />
        <Input as="textarea" rows={3} className="crm-span" label="Handover note for Accounts" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Billing contact, go-live date, anything Accounts should know" />
      </div>
    </Modal>
  );
}

export function CloseDialog({ lead, onCancel, onSubmit }) {
  const [form, setForm] = useState({ reason: CLOSE_REASONS[0], note: "" });
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Modal
        open={!confirming}
        title="Close lead"
        subtitle={lead.hospitalName}
        onClose={onCancel}
        footer={<><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant="danger" onClick={() => setConfirming(true)}>Mark not interested</Button></>}
      >
        {lead.status === "Agreed" && <p className="crm-callout crm-callout-warn">This lead is waiting for Accounts. Closing it removes it from their registration queue.</p>}
        <div className="crm-form">
          <Select className="crm-span" label="Reason *" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}>
            {CLOSE_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
          </Select>
          <Input as="textarea" rows={3} className="crm-span" label="Note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </div>
      </Modal>
      <ConfirmDialog
        open={confirming}
        title="Close this lead?"
        message={`${lead.hospitalName} will be marked Not interested (${form.reason}). You can reopen it later.`}
        confirmLabel="Close lead"
        onCancel={() => setConfirming(false)}
        onConfirm={() => onSubmit({ reason: form.reason, note: form.note.trim() })}
      />
    </>
  );
}

export function ReopenDialog({ lead, onCancel, onConfirm }) {
  return (
    <ConfirmDialog
      open
      title="Reopen lead?"
      message={`${lead.hospitalName} will go back to your open leads${lead.closeReason ? ` (closed as “${lead.closeReason}”)` : ""}.`}
      confirmLabel="Reopen lead"
      tone="primary"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function EditLeadDialog({ lead, planOptions, onCancel, onSubmit }) {
  const lockedPlan = lead.status === "Agreed";
  const existingPhone = parsePhoneNumber(lead.contactPhone || "");
  const [form, setForm] = useState({
    priority: lead.priority || "Medium",
    source: lead.source || "",
    type: lead.type || "",
    contactPerson: lead.contactPerson || "",
    designation: lead.designation || "",
    phoneCode: existingPhone.phoneCode,
    contactPhone: existingPhone.phone,
    contactEmail: lead.contactEmail || "",
    hospitalEmail: lead.hospitalEmail || "",
    city: lead.city || "",
    state: lead.state || "",
    plan: lead.plan || "",
    billingCycle: lead.billingCycle || "",
  });
  const [errors, setErrors] = useState({});
  const set = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const submit = () => {
    const next = {};
    if (!required(form.contactPerson)) next.contactPerson = "Enter the contact person.";
    if (!validPhoneForCode(form.contactPhone, form.phoneCode || DEFAULT_PHONE_CODE)) next.contactPhone = (form.phoneCode || DEFAULT_PHONE_CODE) === DEFAULT_PHONE_CODE
      ? "Enter a 10-digit phone number."
      : "Enter a valid phone number for the selected country code.";
    if (form.contactEmail.trim() && !isEmail(form.contactEmail)) next.contactEmail = "Enter a valid email address.";
    if (form.hospitalEmail.trim() && !isEmail(form.hospitalEmail)) next.hospitalEmail = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const values = { ...form };
    if (lockedPlan) {
      delete values.plan;
      delete values.billingCycle;
    }
    onSubmit(values);
  };
  const sources = LEAD_SOURCES.includes(lead.source) || !lead.source ? LEAD_SOURCES : [lead.source, ...LEAD_SOURCES];
  const types = hospitalTypes.includes(lead.type) || !lead.type ? hospitalTypes : [lead.type, ...hospitalTypes];
  const plans = planOptions.includes(lead.plan) || !lead.plan ? planOptions : [lead.plan, ...planOptions];

  return (
    <Modal
      open
      size="lg"
      title="Edit lead details"
      subtitle={lead.hospitalName}
      onClose={onCancel}
      footer={<><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button onClick={submit}>Save changes</Button></>}
    >
      <div className="crm-form">
        <h3 className="crm-span crm-form-title">Sales</h3>
        <Select label="Priority" value={form.priority} onChange={set("priority")}>
          {PRIORITIES.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select label="Source" value={form.source} onChange={set("source")}>
          <option value="">Not specified</option>
          {sources.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select label="Interested plan" value={form.plan} disabled={lockedPlan} onChange={set("plan")}>
          <option value="">Not specified</option>
          {plans.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select label="Billing cycle" value={form.billingCycle} disabled={lockedPlan} onChange={set("billingCycle")}>
          <option value="">Not specified</option>
          {billingCycles.map((item) => <option key={item}>{item}</option>)}
        </Select>
        {lockedPlan && <p className="crm-span crm-hint">The agreed plan was handed over to Accounts and can no longer be changed here.</p>}
        <h3 className="crm-span crm-form-title">Contact</h3>
        <Input label="Contact person *" value={form.contactPerson} error={errors.contactPerson} onChange={set("contactPerson")} />
        <Input label="Designation" value={form.designation} onChange={set("designation")} />
        <PhoneInput label="Phone" required value={form.contactPhone} countryCode={form.phoneCode} error={errors.contactPhone} onChange={set("contactPhone")} onCountryCodeChange={set("phoneCode")} />
        <Input label="Contact email" type="email" value={form.contactEmail} error={errors.contactEmail} onChange={set("contactEmail")} autoComplete="email" />
        <h3 className="crm-span crm-form-title">Hospital</h3>
        <Select label="Hospital type" value={form.type} onChange={set("type")}>
          <option value="">Not specified</option>
          {types.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Input label="Hospital email" type="email" value={form.hospitalEmail} error={errors.hospitalEmail} onChange={set("hospitalEmail")} autoComplete="email" />
        <Input label="City" value={form.city} onChange={set("city")} />
        <Input label="State" value={form.state} onChange={set("state")} />
      </div>
    </Modal>
  );
}
