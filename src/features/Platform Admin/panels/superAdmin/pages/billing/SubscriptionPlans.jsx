import { useState } from "react";
import Button from "../../../../shared/components/Button";
import Modal from "../../../../shared/components/Modal";
import { usePlatformPlans } from "../../../../shared/hooks/usePlatformPlans";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import "./SubscriptionPlans.css";

function money(value) {
  if (value == null || value === "") return "—";
  return formatCurrency(value);
}

export default function SubscriptionPlans() {
  const { hospitals } = useRegisteredHospitals();
  const { plans, loading, error, reload } = usePlatformPlans();
  const [open, setOpen] = useState(null);
  const hospitalCount = (name) => hospitals.filter((hospital) => hospital.plan === name).length;
  const activeCount = plans.filter((plan) => plan.isActive).length;

  return (
    <section className="plans-page">
      <header className="page-header">
        <h1>Subscription Plans</h1>
        <Button disabled title="This screen reads the catalog. It does not change plan prices.">Add plan</Button>
      </header>
      <p className="panel-copy" style={{ marginTop: -6, marginBottom: 14 }}>
        Prices come from the plan catalog. Annual price is the catalog annual price. Changing a catalog price later does not rewrite old invoices or a hospital that already has a subscription amount.
      </p>
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
        <div className="plans-summary-item"><span>Default</span><strong>Professional</strong></div>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <article key={plan.name} className={`plan-card${plan.name === "Professional" ? " popular" : ""}`}>
            <div className="plan-head">
              {plan.name === "Professional" && <span className="plan-ribbon">Default</span>}
              <h2>{plan.name}</h2>
              <span className={`plan-status ${plan.isActive ? "on" : "off"}`}>{plan.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="plan-pricing">
              <p className="plan-price"><strong>{money(plan.monthlyPrice)}</strong><span>/ month</span></p>
              <p className="plan-annual">Annual {money(plan.annualPrice)}</p>
            </div>
            <dl className="plan-limits">
              <div><dt>Billing</dt><dd>{plan.billingCycles.join(", ") || "—"}</dd></div>
            </dl>
            <div className="plan-stats">
              <div><span>Hospitals</span><strong>{hospitalCount(plan.name)}</strong></div>
              <div><span>Monthly</span><strong>{money(plan.monthlyPrice)}</strong></div>
            </div>
            <div className="plan-actions">
              <button type="button" className="action-link" onClick={() => setOpen(plan)}>View</button>
              <button type="button" className="action-link" disabled title="Catalog changes are not available from this screen.">Edit</button>
              <button type="button" className="action-link danger" disabled title="Catalog changes are not available from this screen.">Deactivate</button>
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
                  {plans.map((plan) => <td key={plan.name}>{plan.billingCycles.join(", ") || "—"}</td>)}
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
            <div className="plan-info-row"><dt>Billing</dt><dd>{open.billingCycles.join(", ") || "—"}</dd></div>
            <div className="plan-info-row"><dt>Hospitals</dt><dd>{hospitalCount(open.name)}</dd></div>
          </dl>
        )}
      </Modal>
    </section>
  );
}
