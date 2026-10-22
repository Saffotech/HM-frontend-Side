import { useRef, useState } from "react";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import Modal from "../../../shared/components/Modal";
import Select from "../../../shared/components/Select";
import { billingCycles, hospitalTypes } from "../../../shared/data/catalog";
import { isEmail, isPhone, phoneDigits, required } from "../../../shared/utils/validation";
import { LEAD_SOURCES, PRIORITIES, findLeadDuplicates } from "../utils/crmLeads";
import { StatusMark } from "./CrmMarks";

const blankLead = {
  hospitalName: "",
  type: "General",
  source: "",
  priority: "Medium",
  contactPerson: "",
  designation: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  hospitalEmail: "",
  plan: "",
  billingCycle: "",
  message: "",
};

function leadErrors(form) {
  const errors = {};
  if (!required(form.hospitalName)) errors.hospitalName = "Enter the hospital name.";
  else if (form.hospitalName.length < 3) errors.hospitalName = "Use at least 3 characters.";
  if (!required(form.contactPerson)) errors.contactPerson = "Enter the contact person.";
  if (!isPhone(form.phone)) errors.phone = "Enter a 10-digit phone number.";
  if (!required(form.source)) errors.source = "Choose a source.";
  if (form.email && !isEmail(form.email)) errors.email = "Enter a valid email address.";
  if (form.hospitalEmail && !isEmail(form.hospitalEmail)) errors.hospitalEmail = "Enter a valid email address.";
  if (!required(form.city)) errors.city = "Enter the city.";
  return errors;
}

function trimLead(form) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => [key, String(value || "").trim()]));
}

export default function AddLeadForm({ leads, me, planOptions, onClose, onCreate, onOpenExisting, onClaim }) {
  const [form, setForm] = useState(blankLead);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [matches, setMatches] = useState(null);
  const [creating, setCreating] = useState(false);
  const [shared, setShared] = useState(false);
  const creatingRef = useRef(false);
  const set = (key) => (event) => {
    const value = key === "phone" ? phoneDigits(event.target.value) : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setFormError("");
  };

  const create = async (input, { allowDuplicate = false } = {}) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    setFormError("");
    try {
      await onCreate({ ...input, priority: input.priority || "Medium" }, { shared, allowDuplicate });
    } catch (error) {
      creatingRef.current = false;
      setCreating(false);
      if (error?.matches) {
        setMatches(error.matches);
        setFormError(error.message || "This hospital matches an existing record.");
        return;
      }
      setFormError(error?.message || "Unable to create lead. Please try again.");
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (creatingRef.current) return;
    const input = trimLead(form);
    const nextErrors = leadErrors(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const leadsFound = findLeadDuplicates(leads, input, me);
    if (leadsFound.length) {
      setMatches({ leads: leadsFound, hospitals: [] });
      return;
    }
    create(input);
  };

  if (matches) {
    return (
      <Modal
        open
        size="lg"
        title="Possible duplicate"
        subtitle={`${form.hospitalName.trim()} looks similar to existing records.`}
        onClose={() => setMatches(null)}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setMatches(null)}>Back to form</Button>
            <Button disabled={creating} onClick={() => create(trimLead(form), { allowDuplicate: true })}>{creating ? "Creating lead..." : "Create lead anyway"}</Button>
          </>
        )}
      >
        {formError && <p className="crm-form-error" role="alert">{formError}</p>}
        {matches.hospitals.length > 0 && (
          <>
            <h3 className="crm-dup-title">Already a SaffoCare hospital</h3>
            <ul className="crm-duplicates">
              {matches.hospitals.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.id} · {item.city}</span>
                    <span>{item.reasons.join(", ")}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {matches.leads.length > 0 && (
          <>
            <h3 className="crm-dup-title">Existing leads</h3>
            <ul className="crm-duplicates">
              {matches.leads.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.mine || item.unclaimed ? item.name : "Existing lead"}</strong>
                    <span>
                      {item.mine && `${item.contact} · ${item.phone}`}
                      {item.unclaimed && "Unclaimed enquiry in New — claim it instead of adding a copy"}
                      {!item.mine && !item.unclaimed && `Owned by ${item.owner.toLowerCase()} — details hidden`}
                    </span>
                    <span>{item.reasons.join(", ")}</span>
                  </div>
                  <div className="crm-dup-side">
                    <StatusMark status={item.status} />
                    {item.mine && <Button variant="secondary" size="sm" onClick={() => onOpenExisting(item.id)}>Open existing</Button>}
                    {item.unclaimed && <Button size="sm" onClick={() => onClaim(item.id)}>Claim</Button>}
                  </div>
                </li>
              ))}
            </ul>
            {matches.leads.some((item) => !item.mine && !item.unclaimed) && (
              <p className="crm-hint">If a lead belongs to someone else, ask your manager to reassign it rather than creating a second one.</p>
            )}
          </>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      open
      title="Add lead"
      subtitle={shared ? "The lead goes to New enquiries for any CRM employee to claim." : "The lead starts as New and is assigned to you."}
      onClose={creating ? () => {} : onClose}
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button type="submit" form="add-lead-form" disabled={creating}>{creating ? "Creating lead..." : "Create lead"}</Button>
        </>
      )}
    >
      <form id="add-lead-form" className="crm-form" noValidate onSubmit={submit}>
        {formError && <p className="crm-span crm-form-error" role="alert">{formError}</p>}
        <h3 className="crm-span crm-form-title">Hospital</h3>
        <Input className="crm-span" label="Hospital name *" value={form.hospitalName} error={errors.hospitalName} onChange={set("hospitalName")} autoFocus />
        <Select label="Hospital type" value={form.type} onChange={set("type")}>
          {hospitalTypes.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Input label="City *" value={form.city} error={errors.city} onChange={set("city")} />
        <Input label="State" value={form.state} onChange={set("state")} />
        <Input label="Hospital email" type="email" value={form.hospitalEmail} error={errors.hospitalEmail} onChange={set("hospitalEmail")} />
        <Select label="Source *" value={form.source} error={errors.source} onChange={set("source")}>
          <option value="">Select source</option>
          {LEAD_SOURCES.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <h3 className="crm-span crm-form-title">Contact</h3>
        <Input label="Contact person *" value={form.contactPerson} error={errors.contactPerson} onChange={set("contactPerson")} />
        <Input label="Designation" value={form.designation} onChange={set("designation")} />
        <Input label="Phone *" inputMode="numeric" maxLength={10} value={form.phone} error={errors.phone} onChange={set("phone")} placeholder="10-digit number" />
        <Input label="Email" type="email" value={form.email} error={errors.email} onChange={set("email")} />
        <h3 className="crm-span crm-form-title">Interest</h3>
        <Select label="Priority" value={form.priority} onChange={set("priority")}>
          {PRIORITIES.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select label="Plan" value={form.plan} onChange={set("plan")}>
          <option value="">Not decided</option>
          {planOptions.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select label="Billing cycle" value={form.billingCycle} onChange={set("billingCycle")}>
          <option value="">Not decided</option>
          {billingCycles.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Input as="textarea" className="crm-span" label="Requirement / message" rows={3} value={form.message} onChange={set("message")} />
        <fieldset className="crm-span crm-assign">
          <legend className="crm-form-title">Who works this lead?</legend>
          <label className={!shared ? "is-on" : ""}>
            <input type="radio" name="lead-owner" checked={!shared} onChange={() => setShared(false)} />
            <span>
              <strong>Keep it for me</strong>
              <small>Assigned to you. Other CRM employees don&apos;t see it.</small>
            </span>
          </label>
          <label className={shared ? "is-on" : ""}>
            <input type="radio" name="lead-owner" checked={shared} onChange={() => setShared(true)} />
            <span>
              <strong>Share in New enquiries</strong>
              <small>Any CRM employee can claim it. Contact details stay hidden until someone claims it.</small>
            </span>
          </label>
        </fieldset>
      </form>
    </Modal>
  );
}
