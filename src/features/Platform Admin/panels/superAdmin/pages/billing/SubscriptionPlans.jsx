import { useState } from "react";
import { Check } from "lucide-react";
import Button from "../../../../shared/components/Button";
import Modal from "../../../../shared/components/Modal";
import { PLAN_NAMES } from "../../../../shared/data/catalog";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import "./SubscriptionPlans.css";

const PLANS = [
  {
    name: "Starter",
    description: "The entry plan name accepted when a hospital is registered.",
  },
  {
    name: "Professional",
    description: "The default plan name on a new tenant.",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "The top plan name accepted when a hospital is registered.",
  },
];

const COMPARE_ROWS = [
  ["Monthly price", "Pricing"],
  ["Annual price"],
  ["Users", "Limits"],
  ["Locations"],
  ["Support"],
];

export default function SubscriptionPlans() {
  const { hospitals } = useRegisteredHospitals();
  const [open, setOpen] = useState(null);
  const hospitalCount = (name) => hospitals.filter((hospital) => hospital.plan === name).length;

  return (
    <section className="plans-page">
      <header className="page-header">
        <h1>Subscription Plans</h1>
        <Button disabled title="There is no plans API, so a new plan cannot be saved.">Add plan</Button>
      </header>
      <p className="panel-copy" style={{ marginTop: -6, marginBottom: 14 }}>
        These are the plan names registration already accepts. Prices, limits, and edits are not stored, because there is no plans API.
      </p>

      <div className="plans-summary">
        <div className="plans-summary-item"><span>Plans</span><strong>{PLAN_NAMES.length}</strong></div>
        <div className="plans-summary-item"><span>Active names</span><strong>{PLAN_NAMES.length}</strong></div>
        <div className="plans-summary-item"><span>Hospitals</span><strong>{hospitals.length}</strong></div>
        <div className="plans-summary-item"><span>Default</span><strong>Professional</strong></div>
      </div>

      <div className="plans-grid">
        {PLANS.map((plan) => (
          <article key={plan.name} className={`plan-card${plan.popular ? " popular" : ""}`}>
            <div className="plan-head">
              {plan.popular && <span className="plan-ribbon">Default</span>}
              <h2>{plan.name}</h2>
              <span className="plan-status on">Catalog</span>
            </div>
            <p className="plan-desc">{plan.description}</p>
            <div className="plan-pricing">
              <p className="plan-price"><strong>—</strong><span>/ month</span></p>
              <p className="plan-annual">Annual price is not set.</p>
            </div>
            <dl className="plan-limits">
              <div><dt>Users</dt><dd>—</dd></div>
              <div><dt>Locations</dt><dd>—</dd></div>
              <div><dt>Support</dt><dd>—</dd></div>
            </dl>
            <div className="plan-features">
              <p className="plan-inherits">Included modules are not listed by a plans API.</p>
              <ul>
                <li><Check size={14} aria-hidden="true" /> Accepted on hospital registration</li>
              </ul>
            </div>
            <div className="plan-stats">
              <div><span>Hospitals</span><strong>{hospitalCount(plan.name)}</strong></div>
              <div><span>Revenue</span><strong>—</strong></div>
            </div>
            <div className="plan-actions">
              <button type="button" className="action-link" onClick={() => setOpen(plan)}>View</button>
              <button type="button" className="action-link" disabled>Edit</button>
              <button type="button" className="action-link danger" disabled>Deactivate</button>
            </div>
          </article>
        ))}
      </div>

      <section className="plans-compare">
        <div className="plans-compare-head"><h2>Compare plans</h2></div>
        <div className="plans-compare-scroll">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                {PLANS.map((plan) => <th key={plan.name}>{plan.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.flatMap(([label, group]) => {
                const feature = (
                  <tr key={label}>
                    <td>{label}</td>
                    {PLANS.map((plan) => <td key={plan.name} className="num">—</td>)}
                  </tr>
                );
                if (!group) return [feature];
                return [
                  <tr key={`${group}-group`} className="group"><th colSpan={4}>{group}</th></tr>,
                  feature,
                ];
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={Boolean(open)}
        title={open?.name || "Plan"}
        subtitle="Catalog name used by registration"
        onClose={() => setOpen(null)}
        footer={<Button variant="secondary" onClick={() => setOpen(null)}>Close</Button>}
      >
        {open && (
          <>
            <dl className="plan-info">
              <div className="plan-info-row"><dt>Name</dt><dd>{open.name}</dd></div>
              <div className="plan-info-row"><dt>Status</dt><dd>Catalog</dd></div>
              <div className="plan-info-row"><dt>Monthly</dt><dd>—</dd></div>
              <div className="plan-info-row"><dt>Annual</dt><dd>—</dd></div>
              <div className="plan-info-row"><dt>Hospitals</dt><dd>{hospitalCount(open.name)}</dd></div>
              <div className="plan-info-row"><dt>Revenue</dt><dd>—</dd></div>
            </dl>
            <h3 className="plan-info-title">Notes</h3>
            <p className="panel-copy">{open.description} Price and limit changes cannot be saved.</p>
          </>
        )}
      </Modal>
    </section>
  );
}
