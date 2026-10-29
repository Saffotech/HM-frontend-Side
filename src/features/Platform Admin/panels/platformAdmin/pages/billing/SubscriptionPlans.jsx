import { useRef, useState } from "react";
import Button from "../../../../shared/components/Button";
import Modal from "../../../../shared/components/Modal";
import { activatePlatformPlan, createPlatformPlan, deactivatePlatformPlan, deletePlatformPlan, updatePlatformPlan } from "../../../../shared/api/platformPlans";
import { platformCallMessage, shouldEndPlatformSession } from "../../../../shared/api/platformErrors";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { usePlatformPlans } from "../../../../shared/hooks/usePlatformPlans";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import "./SubscriptionPlans.css";

const EMPTY_FORM = { name: "", monthlyPrice: "", annualMonthsCharged: "" };

function editValues(plan) {
  return {
    name: plan.name,
    monthlyPrice: String(plan.monthlyPrice ?? ""),
    annualMonthsCharged: String(plan.annualMonthsCharged ?? 10),
  };
}

function validatePlanForm(values, editing = false) {
  const errors = {};
  const name = values.name.trim();
  const monthly = Number(values.monthlyPrice);
  const annual = values.annualMonthsCharged === "" ? null : Number(values.annualMonthsCharged);
  if (!name) errors.name = "Enter a plan name.";
  else if (name.length > 50) errors.name = "Plan names can be at most 50 characters.";
  if (!Number.isInteger(monthly) || monthly <= 0 || monthly > 10_000_000) {
    errors.monthlyPrice = "Enter a whole monthly price greater than zero.";
  }
  if (annual != null && (!Number.isInteger(annual) || annual < 1 || annual > 24)) {
    errors.annualMonthsCharged = "Enter between 1 and 24 months, or leave this blank for the default.";
  } else if (editing && annual == null) {
    errors.annualMonthsCharged = "Enter the number of months charged for annual billing.";
  }
  return errors;
}

function formErrorsFromApi(fieldErrors = {}) {
  const fields = { name: "name", monthly_price: "monthlyPrice", annual_months_charged: "annualMonthsCharged" };
  return Object.fromEntries(Object.entries(fieldErrors).map(([key, message]) => [fields[key] || key, message]));
}

function money(value) {
  if (value == null || value === "") return "—";
  return formatCurrency(value);
}

function hospitalsKeepingPlan(name, count) {
  if (count === 1) return `1 hospital already on ${name} keeps this plan.`;
  if (count === 0) return `No hospital is currently on ${name}.`;
  return `${count} hospitals already on ${name} keep this plan.`;
}

export default function SubscriptionPlans() {
  const { hospitals } = useRegisteredHospitals();
  const { plans, loading, error, reload } = usePlatformPlans();
  const { signOutPortal } = usePlatform();
  const [open, setOpen] = useState(null);
  const [formMode, setFormMode] = useState("");
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [mutationError, setMutationError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const hospitalCount = (name) => hospitals.filter((hospital) => hospital.plan === name).length;
  const activeCount = plans.filter((plan) => plan.isActive).length;

  // The page no longer shows an Add plan control. This handler stays for the existing create form.
  // eslint-disable-next-line no-unused-vars
  const beginAdd = () => {
    setOpen(null);
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setMutationError("");
    setFeedback("");
    setFormMode("add");
  };

  const beginEdit = (plan) => {
    setOpen(null);
    setEditingPlan(plan);
    setForm(editValues(plan));
    setFormErrors({});
    setMutationError("");
    setFeedback("");
    setFormMode("edit");
  };

  const handleApiError = (err) => {
    setMutationError(platformCallMessage(err));
    setFormErrors(formErrorsFromApi(err?.fieldErrors));
    if (shouldEndPlatformSession(err)) signOutPortal("platform");
    if (err?.status === 404) reload();
  };

  const submitPlan = async (event) => {
    event.preventDefault();
    if (busyRef.current) return;
    const errors = validatePlanForm(form, formMode === "edit");
    setFormErrors(errors);
    setMutationError("");
    setFeedback("");
    if (Object.keys(errors).length) return;
    if (formMode === "edit" && editingPlan) {
      const unchanged = form.name.trim() === editingPlan.name
        && Number(form.monthlyPrice) === Number(editingPlan.monthlyPrice)
        && Number(form.annualMonthsCharged) === Number(editingPlan.annualMonthsCharged);
      if (unchanged) {
        setMutationError("Change at least one field before saving.");
        return;
      }
      if (editingPlan.id == null) {
        setMutationError("This plan has no server ID, so it cannot be edited.");
        return;
      }
    }
    busyRef.current = true;
    setBusy(true);
    try {
      if (formMode === "add") {
        await createPlatformPlan(form);
        setFeedback("Plan added successfully.");
      } else {
        await updatePlatformPlan(editingPlan.id, editingPlan, form);
        setFeedback("Plan updated successfully.");
      }
      setFormMode("");
      reload();
    } catch (err) {
      handleApiError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivating || deactivating.id == null || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMutationError("");
    setFeedback("");
    try {
      await deactivatePlatformPlan(deactivating.id);
      setDeactivating(null);
      reload();
    } catch (err) {
      handleApiError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const activatePlan = async (plan) => {
    if (plan.id == null || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMutationError("");
    setFeedback("");
    try {
      await activatePlatformPlan(plan.id);
      setFeedback(`${plan.name} was activated.`);
      reload();
    } catch (err) {
      handleApiError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting || deleting.id == null || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMutationError("");
    setFeedback("");
    try {
      await deletePlatformPlan(deleting.id);
      setDeleting(null);
      reload();
    } catch (err) {
      setDeleting(null);
      handleApiError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="plans-page">
      <div className="plans-toolbar">
        {feedback && <p className="plans-feedback" role="status">{feedback}</p>}
        {mutationError && <p className="plans-mutation-error" role="alert">{mutationError}</p>}
      </div>
      {loading && <p className="panel-copy">Loading plans.</p>}
      {error && (
        <div role="alert">
          <p className="panel-copy">{error}</p>
          <Button variant="secondary" onClick={reload}>Try again</Button>
        </div>
      )}

      <div className="plans-summary">
        <div className="plans-summary-item"><span>Plans</span><strong>{plans.length}</strong></div>
        <div className="plans-summary-item"><span>Active</span><strong>{activeCount}</strong></div>
        <div className="plans-summary-item"><span>Hospitals</span><strong>{hospitals.length}</strong></div>
        <div className="plans-summary-item"><span>Popular</span><strong>Professional</strong></div>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <article key={plan.id ?? plan.name} className={`plan-card${plan.name === "Professional" ? " popular" : ""}${plan.isActive ? "" : " inactive"}`}>
            <div className="plan-head">
              {plan.name === "Professional" && <span className="plan-ribbon">Popular</span>}
              <h2>{plan.name}</h2>
              <span className={`plan-status ${plan.isActive ? "on" : "off"}`}>{plan.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="plan-pricing">
              <p className="plan-price"><strong>{money(plan.monthlyPrice)}</strong><span>/ month</span></p>
              <p className="plan-annual">Annual {money(plan.annualPrice)}</p>
            </div>
            <dl className="plan-limits">
              <div><dt>Billing</dt><dd>{plan.billingCycles.join(" · ") || "—"}</dd></div>
            </dl>
            <div className="plan-stats">
              <div><span>Hospitals</span><strong>{hospitalCount(plan.name)}</strong></div>
              <div><span>Monthly</span><strong>{money(plan.monthlyPrice)}</strong></div>
            </div>
            <div className="plan-actions">
              <Button variant="outline" size="sm" onClick={() => setOpen(plan)}>View</Button>
              <Button variant="outline" size="sm" onClick={() => beginEdit(plan)} disabled={busy || plan.id == null} title={plan.id == null ? "This plan has no server ID." : "Edit plan"}>Edit</Button>
              {plan.isActive ? (
                <Button variant="danger" size="sm" onClick={() => { setMutationError(""); setFeedback(""); setDeleting(null); setDeactivating(plan); }} disabled={busy || plan.id == null} title={plan.id == null ? "This plan has no server ID." : "Deactivate plan"}>Deactivate</Button>
              ) : (
                <Button variant="outline" size="sm" className="plan-activate-action" onClick={() => activatePlan(plan)} disabled={busy || plan.id == null} title={plan.id == null ? "This plan has no server ID." : "Activate plan"}>Activate</Button>
              )}
            </div>
          </article>
        ))}
      </div>

      {plans.length > 0 && (
        <section className="plans-compare">
          <div className="plans-compare-head"><h2>Compare plans</h2></div>
          <div className="plans-compare-scroll">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  {plans.map((plan) => <th key={plan.name}>{plan.name}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="group"><th colSpan={plans.length + 1}>Pricing</th></tr>
                <tr>
                  <td>Monthly price</td>
                  {plans.map((plan) => <td key={plan.name} className="num">{money(plan.monthlyPrice)}</td>)}
                </tr>
                <tr>
                  <td>Annual price</td>
                  {plans.map((plan) => <td key={plan.name} className="num">{money(plan.annualPrice)}</td>)}
                </tr>
                <tr>
                  <td>Billing cycles</td>
                  {plans.map((plan) => <td key={plan.name}>{plan.billingCycles.join(" · ") || "—"}</td>)}
                </tr>
                <tr>
                  <td>Status</td>
                  {plans.map((plan) => <td key={plan.name}>{plan.isActive ? "Active" : "Inactive"}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal
        open={Boolean(open)}
        title={open?.name || "Plan"}
        subtitle="Catalog price used when a hospital amount is not sent"
        onClose={() => setOpen(null)}
        footer={<Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>}
      >
        {open && (
          <dl className="plan-info">
            <div className="plan-info-row"><dt>Name</dt><dd>{open.name}</dd></div>
            <div className="plan-info-row"><dt>Status</dt><dd>{open.isActive ? "Active" : "Inactive"}</dd></div>
            <div className="plan-info-row"><dt>Monthly</dt><dd>{money(open.monthlyPrice)}</dd></div>
            <div className="plan-info-row"><dt>Annual</dt><dd>{money(open.annualPrice)}</dd></div>
            <div className="plan-info-row"><dt>Billing</dt><dd>{open.billingCycles.join(" · ") || "—"}</dd></div>
            <div className="plan-info-row"><dt>Hospitals</dt><dd>{hospitalCount(open.name)}</dd></div>
          </dl>
        )}
      </Modal>

      <Modal
        open={Boolean(formMode)}
        title={formMode === "edit" ? `Edit ${editingPlan?.name || "plan"}` : "Add plan"}
        subtitle={formMode === "edit" ? "Update the supported plan catalog fields." : "Create an active plan in the subscription catalog."}
        onClose={() => { if (!busy) setFormMode(""); }}
        footer={<>
          <Button variant="secondary" onClick={() => setFormMode("")} disabled={busy}>Cancel</Button>
          <Button type="submit" form="platform-plan-form" disabled={busy}>{busy ? "Saving…" : formMode === "edit" ? "Save changes" : "Add plan"}</Button>
        </>}
      >
        <form id="platform-plan-form" className="plan-form" onSubmit={submitPlan} noValidate>
          <label>
            Plan name
            <input name="name" value={form.name} maxLength={50} required disabled={busy} aria-invalid={Boolean(formErrors.name)} aria-describedby={formErrors.name ? "plan-name-error" : undefined} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setFormErrors((current) => ({ ...current, name: "" })); }} />
            {formErrors.name && <small id="plan-name-error" className="plan-field-error">{formErrors.name}</small>}
          </label>
          <label>
            Monthly price
            <input name="monthlyPrice" type="number" min="1" max="10000000" step="1" value={form.monthlyPrice} required disabled={busy} aria-invalid={Boolean(formErrors.monthlyPrice)} aria-describedby={formErrors.monthlyPrice ? "plan-price-error" : undefined} onChange={(event) => { setForm((current) => ({ ...current, monthlyPrice: event.target.value })); setFormErrors((current) => ({ ...current, monthlyPrice: "" })); }} />
            {formErrors.monthlyPrice && <small id="plan-price-error" className="plan-field-error">{formErrors.monthlyPrice}</small>}
          </label>
          <label>
            Annual months charged <span className="plan-optional">(optional, default 10)</span>
            <input name="annualMonthsCharged" type="number" min="1" max="24" step="1" value={form.annualMonthsCharged} disabled={busy} aria-invalid={Boolean(formErrors.annualMonthsCharged)} aria-describedby={formErrors.annualMonthsCharged ? "plan-annual-error" : undefined} onChange={(event) => { setForm((current) => ({ ...current, annualMonthsCharged: event.target.value })); setFormErrors((current) => ({ ...current, annualMonthsCharged: "" })); }} />
            {formErrors.annualMonthsCharged && <small id="plan-annual-error" className="plan-field-error">{formErrors.annualMonthsCharged}</small>}
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deactivating)}
        title="Deactivate plan?"
        subtitle={deactivating ? `New hospitals cannot select ${deactivating.name}.` : ""}
        onClose={() => { if (!busy) setDeactivating(null); }}
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setDeactivating(null)} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeactivation} disabled={busy}>{busy ? "Deactivating…" : "Deactivate plan"}</Button>
        </>}
      >
        {deactivating && (
          <ul className="plan-confirm">
            <li>{hospitalsKeepingPlan(deactivating.name, hospitalCount(deactivating.name))}</li>
            <li>Invoices already issued for {deactivating.name} keep their amount.</li>
          </ul>
        )}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        title="Delete plan?"
        subtitle={deleting ? `${deleting.name} will be removed from the catalog.` : ""}
        onClose={() => { if (!busy) setDeleting(null); }}
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setDeleting(null)} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} disabled={busy}>{busy ? "Deleting…" : "Delete plan"}</Button>
        </>}
      >
        <p className="panel-copy">The plan stays in the list if a hospital, lead, or invoice still uses it.</p>
      </Modal>
    </section>
  );
}
