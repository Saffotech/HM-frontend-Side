import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { interpretPlatformError, platformCallMessage, shouldEndPlatformSession } from "../../../../shared/api/platformErrors";
import { getTenant, setTenantActive, updateTenant } from "../../../../shared/api/registrationApi";
import {
  TENANT_UPDATE_FIELDS,
  tenantEditDraft,
  tenantUpdateBody,
  validateTenantUpdate,
} from "../../../../shared/api/tenantUpdate";
import { catalogPrice } from "../../../../shared/api/platformPlans";
import { applyConfirmedTenantActivation } from "../../tenantActivation";
import Button from "../../../../shared/components/Button";
import EmptyState from "../../../../shared/components/EmptyState";
import Input from "../../../../shared/components/Input";
import Select from "../../../../shared/components/Select";
import { PLAN_NAMES, billingCycles } from "../../../../shared/data/catalog";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { usePlatformPlans } from "../../../../shared/hooks/usePlatformPlans";
import { usePlatformRevenue } from "../../../../shared/hooks/usePlatformRevenue";
import { platformPath } from "../../../../shared/paths";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { formatDate } from "../../../../shared/utils/formatDate";
import "./TenantDetails.css";

export default function TenantDetails() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getTenant(tenantId)
      .then((body) => {
        if (!cancelled) setTenant(body);
      })
      .catch((err) => {
        if (!cancelled) setError(interpretPlatformError(err).toast);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (loading) {
    return (
      <section className="td-panel td-pad">
        <EmptyState title="Loading hospital" message="Fetching this hospital from the server." />
      </section>
    );
  }

  if (!tenant) {
    return (
      <section className="td-panel td-pad">
        <EmptyState
          title="Hospital not found"
          message={error || "This hospital is not on the server."}
          action={<Button onClick={() => navigate(platformPath("/hospitals"))}>Back to hospitals</Button>}
        />
      </section>
    );
  }

  return (
    <RegisteredFromApi
      tenant={tenant}
      onUpdated={setTenant}
      onBack={() => navigate(platformPath("/hospitals"))}
    />
  );
}

function showDay(value) {
  if (!value) return "—";
  const day = String(value).slice(0, 10);
  return formatDate(`${day}T00:00:00`);
}

function money(value) {
  if (value == null || value === "") return "—";
  return formatCurrency(value);
}

function RegisteredFromApi({ tenant, onUpdated, onBack }) {
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const canToggle = typeof tenant.is_active === "boolean";
  const nextActive = !tenant.is_active;

  const changeActivation = async () => {
    if (!canToggle || pending) return;
    const action = nextActive ? "reactivate" : "suspend";
    const confirmed = window.confirm(`${nextActive ? "Reactivate" : "Suspend"} ${tenant.name || "this hospital"}?`);
    if (!confirmed) return;
    setPending(true);
    setNotice("");
    setActionError("");
    try {
      const updated = await setTenantActive(tenant.tenant_id, nextActive);
      if (!updated || typeof updated.is_active !== "boolean") {
        setActionError("The server did not return the hospital status.");
        return;
      }
      applyConfirmedTenantActivation(updated);
      onUpdated(updated);
      setEditing(false);
      setNotice(nextActive ? "Hospital reactivated." : "Hospital suspended.");
    } catch (err) {
      setActionError(interpretPlatformError(err).toast || `Could not ${action} this hospital.`);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="td-page">
      <button type="button" className="td-back" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true" />Back to hospitals
      </button>
      <header className="td-record">
        <div className="td-identity">
          <div className="td-logo" aria-hidden="true">{(tenant.name || "H").split(" ").slice(0, 2).map((word) => word[0]).join("")}</div>
          <div>
            <div className="td-title-row">
              <h1>{tenant.name}</h1>
              <Chip value={typeof tenant.is_active === "boolean" ? (tenant.is_active ? "Active" : "Suspended") : (tenant.tenant_status || "—")} />
              <Chip value={tenant.subscription_status} />
            </div>
            <div className="td-meta">
              <span className="td-mono">{tenant.tenant_id}</span>
              <span className="td-mono">{tenant.code}</span>
              <span>{tenant.hospital_type}</span>
            </div>
          </div>
        </div>
        <div className="td-actions">
          <Button variant="secondary" disabled={pending} onClick={() => { setEditing((open) => !open); setActionError(""); }}>
            {editing ? "Close edit" : "Edit hospital"}
          </Button>
          <Button
            variant={tenant.is_active ? "danger" : "success"}
            disabled={!canToggle || pending}
            onClick={changeActivation}
          >
            {pending ? "Saving…" : tenant.is_active ? "Suspend hospital" : "Reactivate hospital"}
          </Button>
        </div>
      </header>
      {notice ? <p className="td-api-note" role="status">{notice}</p> : null}
      {actionError ? <p className="td-api-note" role="alert">{actionError}</p> : null}
      {editing ? (
        <HospitalEditForm
          tenant={tenant}
          disabled={pending}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            onUpdated(updated);
            setEditing(false);
            setNotice("Hospital updated.");
            setActionError("");
          }}
        />
      ) : null}
      <section className="td-panel">
        <div className="td-body">
          <div className="td-two">
            <Box title="Hospital">
              <Info label="Tenant id" value={<span className="td-mono">{tenant.tenant_id}</span>} />
              <Info label="Code" value={<span className="td-mono">{tenant.code}</span>} />
              <Info label="Type" value={tenant.hospital_type} />
              <Info label="Phone" value={tenant.phone} />
              <Info label="Address" value={tenant.address} />
              <Info label="Administrator" value={tenant.admin_email} />
              <Info label="Administrator user" value={tenant.admin_user_id} />
              <Info label="Can sign in" value={tenant.is_active ? "Yes" : "No"} />
            </Box>
            <Box title="Subscription">
              <Info label="Plan" value={`${tenant.plan} · ${tenant.billing_cycle}`} />
              <Info label="Amount" value={money(tenant.subscription_amount)} />
              <Info label="Subscription status" value={<Chip value={tenant.subscription_status} />} />
              <Info label="Tenant status" value={tenant.tenant_status} />
              <Info label="Trial period" value={tenant.trial_period} />
              <Info label="Started" value={showDay(tenant.subscription_started_on)} />
              <Info label="Renews" value={showDay(tenant.subscription_renews_on)} />
            </Box>
          </div>
          <SubscriptionHistory tenantId={tenant.tenant_id} />
        </div>
      </section>
    </section>
  );
}

const invoiceTones = { Paid: "green", Pending: "amber", Overdue: "red", Failed: "grey" };

function SubscriptionHistory({ tenantId }) {
  const { revenue, loading, error } = usePlatformRevenue();
  const rows = useMemo(
    () => (revenue?.invoices || []).filter((invoice) => String(invoice.tenantId) === String(tenantId)),
    [revenue, tenantId],
  );

  return (
    <section className="td-box">
      <header>
        <h2>Subscriptions</h2>
      </header>
      {loading && !revenue ? (
        <p className="td-empty">Loading subscriptions.</p>
      ) : error && !revenue ? (
        <p className="td-empty">{error}</p>
      ) : rows.length === 0 ? (
        <p className="td-empty">This hospital has not taken a subscription yet.</p>
      ) : (
        <table className="td-table">
          <thead>
            <tr>
              <th>Taken on</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((invoice) => (
              <tr key={invoice.id}>
                <td>{showDay(invoice.invoiceDate)}</td>
                <td>{[invoice.plan, invoice.billingCycle].filter(Boolean).join(" · ") || "—"}</td>
                <td>{money(invoice.bucket === "collected" && invoice.paymentAmount != null ? invoice.paymentAmount : invoice.amount)}</td>
                <td>{showDay(invoice.dueDate)}</td>
                <td><span className={`td-chip td-chip-${invoiceTones[invoice.status] || "grey"}`}>{invoice.status || "—"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function HospitalEditForm({ tenant, disabled, onCancel, onSaved }) {
  const { signOutPortal } = usePlatform();
  const { plans } = usePlatformPlans();
  const original = useMemo(() => tenantEditDraft(tenant), [tenant]);
  const [draft, setDraft] = useState(original);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const planNames = useMemo(() => {
    const remote = plans.filter((plan) => plan.isActive).map((plan) => plan.name);
    const names = remote.length ? remote : PLAN_NAMES;
    return original.plan && !names.includes(original.plan) ? [original.plan, ...names] : names;
  }, [original.plan, plans]);
  const selectedPlan = plans.find((plan) => plan.name === draft.plan);
  const cycles = selectedPlan?.billingCycles?.length
    ? selectedPlan.billingCycles
    : billingCycles;
  const cycleOptions = draft.billingCycle && !cycles.includes(draft.billingCycle)
    ? [draft.billingCycle, ...cycles]
    : cycles;
  const price = catalogPrice(selectedPlan, draft.billingCycle);
  const planOrCycleChanged = draft.plan !== original.plan || draft.billingCycle !== original.billingCycle;
  const amountChanged = String(draft.amount).trim() !== original.amount;

  const setField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setFormError("");
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving || disabled) return;
    const body = tenantUpdateBody(tenant, draft);
    const nextErrors = validateTenantUpdate(body);
    const formErrors = Object.fromEntries(
      Object.entries(nextErrors).map(([key, message]) => [TENANT_UPDATE_FIELDS[key] || key, message]),
    );
    if (Object.keys(formErrors).length) {
      setErrors(formErrors);
      setFormError("Check the highlighted fields.");
      return;
    }
    if (!Object.keys(body).length) {
      setFormError("No changes to save.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const updated = await updateTenant(tenant.tenant_id, body);
      if (!updated || updated.tenant_id == null) {
        setFormError("The server did not return the hospital.");
        return;
      }
      onSaved(updated);
    } catch (err) {
      const result = interpretPlatformError(err, TENANT_UPDATE_FIELDS);
      if (Object.keys(result.fieldErrors).length) setErrors(result.fieldErrors);
      setFormError(err?.status === 422 ? "Check the highlighted fields." : platformCallMessage(err));
      if (shouldEndPlatformSession(err)) signOutPortal("platform");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="td-panel td-form" onSubmit={save} noValidate>
      <div className="td-form-grid">
        <Input label="Hospital name" value={draft.name} error={errors.name} onChange={(event) => setField("name", event.target.value)} />
        <Input label="Phone" value={draft.phone} error={errors.phone} onChange={(event) => setField("phone", event.target.value)} />
        <Input className="td-span" label="Address" value={draft.address} error={errors.address} onChange={(event) => setField("address", event.target.value)} />
        <Select label="Plan" value={draft.plan} error={errors.plan} onChange={(event) => setField("plan", event.target.value)}>
          {planNames.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
        </Select>
        <Select label="Billing cycle" value={draft.billingCycle} error={errors.billingCycle} onChange={(event) => setField("billingCycle", event.target.value)}>
          {cycleOptions.map((cycle) => <option key={cycle} value={cycle}>{cycle}</option>)}
        </Select>
        <Input label="Renews on" type="date" value={draft.renewsOn} error={errors.renewsOn} onChange={(event) => setField("renewsOn", event.target.value)} />
        <Input
          label="Subscription amount (rupees)"
          inputMode="numeric"
          value={draft.amount}
          error={errors.amount}
          onChange={(event) => setField("amount", event.target.value.replace(/[^\d]/g, ""))}
        />
      </div>
      <p className="td-api-note">
        Only changed fields are sent.
        {planOrCycleChanged && !amountChanged
          ? " The plan or billing cycle changed and the amount was left as it is, so the server will set the amount from the current catalog."
          : " Leave the amount unchanged to keep it, unless the plan or billing cycle is changing."}
        {price != null ? ` Catalog price for this selection: ${formatCurrency(price)}.` : ""}
        {" "}Already issued invoices stay as they were.
      </p>
      {formError ? <p className="td-api-note" role="alert">{formError}</p> : null}
      <div className="td-form-actions">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving || disabled}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}

const chipTones = {
  Active: "green",
  Trial: "blue",
  Suspended: "amber",
};

function Chip({ value }) {
  return <span className={`td-chip td-chip-${chipTones[value] || "grey"}`}>{value}</span>;
}

function Box({ title, children }) {
  return (
    <section className="td-box">
      <header>
        <h2>{title}</h2>
      </header>
      <div className="td-box-body">{children}</div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="td-info">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}
