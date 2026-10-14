import { useMemo, useState } from "react";
import { Check, Minus } from "lucide-react";
import Button from "../../../../shared/components/Button";
import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import Input from "../../../../shared/components/Input";
import Modal from "../../../../shared/components/Modal";
import Select from "../../../../shared/components/Select";
import PageHeader from "../../layout/PageHeader";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { useToast } from "../../../../shared/hooks/useToast";
import { CURRENCY, formatCurrency } from "../../../../shared/utils/formatCurrency";
import "./SubscriptionPlans.css";

const blank = {
  id: "",
  name: "",
  price: 4999,
  billingCycle: "Monthly",
  tenantLimit: "1 facility",
  userLimit: 10,
  storageLimitGb: 25,
  features: [],
  status: "Active",
  description: "",
};

const INHERIT = /^(?:Everything in (.+)|All (.+?) Features)$/i;

function inheritedPlanName(feature) {
  const match = feature.match(INHERIT);
  return match ? (match[1] || match[2]) : null;
}

function resolveFeatures(plan, plans, seen = new Set()) {
  if (!plan || seen.has(plan.id)) return [];
  seen.add(plan.id);
  return plan.features.flatMap((feature) => {
    const parentName = inheritedPlanName(feature);
    if (!parentName) return [feature];
    return resolveFeatures(plans.find((item) => item.name.toLowerCase() === parentName.toLowerCase()), plans, seen);
  });
}

export default function SubscriptionPlans() {
  const { plans, hospitals, savePlan, setPlanStatus } = usePlatform();
  const { push } = useToast();
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [featureText, setFeatureText] = useState("");

  const usage = useMemo(() => Object.fromEntries(plans.map((plan) => {
    const subscribed = hospitals.filter((hospital) => hospital.plan === plan.name && hospital.status !== "Closed");
    return [plan.id, {
      hospitals: subscribed.length,
      mrr: subscribed.reduce((sum, hospital) => sum + (hospital.monthlyRecurring || 0), 0),
    }];
  })), [hospitals, plans]);

  const resolved = useMemo(() => Object.fromEntries(plans.map((plan) => [plan.id, resolveFeatures(plan, plans)])), [plans]);
  const allFeatures = useMemo(() => [...new Set(plans.flatMap((plan) => resolved[plan.id]))], [plans, resolved]);

  const totals = {
    active: plans.filter((plan) => plan.status === "Active").length,
    hospitals: Object.values(usage).reduce((sum, item) => sum + item.hospitals, 0),
    mrr: Object.values(usage).reduce((sum, item) => sum + item.mrr, 0),
    preferred: plans.find((plan) => plan.preferred)?.name || "—",
  };

  const openEdit = (plan) => {
    setEditing(plan ? { ...plan } : { ...blank, id: `plan-${Date.now()}` });
    setFeatureText(plan ? plan.features.join("\n") : "");
  };

  const save = () => {
    if (!editing.name.trim() || Number(editing.price) <= 0) {
      push("Enter a plan name and a price greater than zero.", "error");
      return;
    }
    savePlan({
      ...editing,
      name: editing.name.trim(),
      price: Number(editing.price),
      userLimit: Number(editing.userLimit),
      storageLimitGb: Number(editing.storageLimitGb),
      features: featureText.split(/\n|,/).map((item) => item.trim()).filter(Boolean),
    });
    setEditing(null);
    push(`${editing.name.trim()} plan saved.`, "success");
  };

  return (
    <section className="plans-page">
      <PageHeader actions={<Button onClick={() => openEdit(null)}>Add Plan</Button>} />

      <div className="plans-summary">
        <Summary label="Active plans" value={`${totals.active} of ${plans.length}`} />
        <Summary label="Subscribed hospitals" value={totals.hospitals} />
        <Summary label="Monthly recurring revenue" value={formatCurrency(totals.mrr)} />
        <Summary label="Most preferred" value={totals.preferred} />
      </div>

      <div className="plans-grid">
        {plans.map((plan) => {
          const active = plan.status === "Active";
          const stats = usage[plan.id] || { hospitals: 0, mrr: 0 };
          const own = plan.features.filter((feature) => !INHERIT.test(feature));
          const inherits = plan.features.find((feature) => INHERIT.test(feature));
          return (
            <article key={plan.id} className={`plan-card ${plan.preferred ? "popular" : ""} ${active ? "" : "inactive"}`}>
              {plan.preferred && <span className="plan-ribbon">Most preferred</span>}
              <header className="plan-head">
                <h2>{plan.name}</h2>
                <span className={`plan-status ${active ? "on" : "off"}`}>{plan.status}</span>
              </header>
              <p className="plan-desc">{plan.description}</p>

              <div className="plan-pricing">
                <p className="plan-price">
                  <strong>{formatCurrency(plan.price)}</strong>
                  <span>/ month</span>
                </p>
                <p className="plan-annual">{formatCurrency(plan.price * 10)} / year when billed annually</p>
              </div>

              <dl className="plan-limits">
                <div><dt>Facilities</dt><dd>{plan.tenantLimit.replace(/\s*facilit(y|ies)$/i, "")}</dd></div>
                <div><dt>Users</dt><dd>Up to {plan.userLimit.toLocaleString()}</dd></div>
                <div><dt>Storage</dt><dd>{plan.storageLimitGb.toLocaleString()} GB</dd></div>
              </dl>

              <div className="plan-features">
                {inherits && <p className="plan-inherits">{inherits}, plus:</p>}
                <ul>
                  {own.map((feature) => (
                    <li key={feature}><Check size={14} aria-hidden="true" />{feature}</li>
                  ))}
                </ul>
              </div>

              <div className="plan-stats">
                <div><span>Hospitals</span><strong>{stats.hospitals}</strong></div>
                <div><span>MRR</span><strong>{formatCurrency(stats.mrr)}</strong></div>
              </div>

              <footer className="plan-actions">
                <button type="button" className="action-link" onClick={() => setViewing(plan)}>View details</button>
                <button type="button" className="action-link" onClick={() => openEdit(plan)}>Edit</button>
                <button type="button" className={`action-link ${active ? "danger" : "strong"}`} onClick={() => setConfirm(plan)}>
                  {active ? "Disable" : "Enable"}
                </button>
              </footer>
            </article>
          );
        })}
      </div>

      <section className="plans-compare">
        <header className="plans-compare-head">
          <h2>Plan comparison</h2>
        </header>
        <div className="plans-compare-scroll">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                {plans.map((plan) => <th key={plan.id}>{plan.name}</th>)}
              </tr>
            </thead>
            <tbody>
              <CompareGroup label="Pricing" span={plans.length + 1} />
              <tr>
                <td>Monthly price</td>
                {plans.map((plan) => <td key={plan.id} className="num">{formatCurrency(plan.price)}</td>)}
              </tr>
              <tr>
                <td>Annual price</td>
                {plans.map((plan) => <td key={plan.id} className="num">{formatCurrency(plan.price * 10)}</td>)}
              </tr>
              <CompareGroup label="Limits" span={plans.length + 1} />
              <tr>
                <td>Facilities</td>
                {plans.map((plan) => <td key={plan.id}>{plan.tenantLimit}</td>)}
              </tr>
              <tr>
                <td>Users</td>
                {plans.map((plan) => <td key={plan.id} className="num">{plan.userLimit.toLocaleString()}</td>)}
              </tr>
              <tr>
                <td>Storage</td>
                {plans.map((plan) => <td key={plan.id} className="num">{plan.storageLimitGb.toLocaleString()} GB</td>)}
              </tr>
              <CompareGroup label="Features" span={plans.length + 1} />
              {allFeatures.map((feature) => (
                <tr key={feature}>
                  <td>{feature}</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="mark">
                      {resolved[plan.id].includes(feature)
                        ? <Check size={16} className="yes" aria-label="Included" />
                        : <Minus size={16} className="no" aria-label="Not included" />}
                    </td>
                  ))}
                </tr>
              ))}
              <CompareGroup label="Usage" span={plans.length + 1} />
              <tr>
                <td>Subscribed hospitals</td>
                {plans.map((plan) => <td key={plan.id} className="num">{usage[plan.id]?.hospitals || 0}</td>)}
              </tr>
              <tr>
                <td>Monthly recurring revenue</td>
                {plans.map((plan) => <td key={plan.id} className="num">{formatCurrency(usage[plan.id]?.mrr || 0)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={Boolean(viewing)} title={viewing ? `${viewing.name} plan` : ""} subtitle={viewing?.description} onClose={() => setViewing(null)} size="lg">
        {viewing && (
          <>
            <dl className="plan-info">
              <InfoRow label="Monthly price" value={formatCurrency(viewing.price)} />
              <InfoRow label="Annual price" value={formatCurrency(viewing.price * 10)} />
              <InfoRow label="Facilities" value={viewing.tenantLimit} />
              <InfoRow label="Users" value={viewing.userLimit.toLocaleString()} />
              <InfoRow label="Storage" value={`${viewing.storageLimitGb.toLocaleString()} GB`} />
              <InfoRow label="Status" value={<span className={`plan-status ${viewing.status === "Active" ? "on" : "off"}`}>{viewing.status}</span>} />
              <InfoRow label="Hospitals" value={usage[viewing.id]?.hospitals || 0} />
              <InfoRow label="MRR" value={formatCurrency(usage[viewing.id]?.mrr || 0)} />
            </dl>
            <h3 className="plan-info-title">Included features</h3>
            <ul className="plan-info-features">
              {resolved[viewing.id].map((feature) => <li key={feature}><Check size={14} aria-hidden="true" />{feature}</li>)}
            </ul>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(editing)}
        title={plans.some((plan) => plan.id === editing?.id) ? "Edit plan" : "Add plan"}
        onClose={() => setEditing(null)}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save plan</Button></>}
      >
        {editing && (
          <div className="form-grid">
            <Input label="Plan name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
            <Input label={`Monthly price (${CURRENCY})`} type="number" min="1" value={editing.price} onChange={(event) => setEditing({ ...editing, price: event.target.value })} />
            <Input label="Facilities" value={editing.tenantLimit} onChange={(event) => setEditing({ ...editing, tenantLimit: event.target.value })} />
            <Input label="User limit" type="number" min="1" value={editing.userLimit} onChange={(event) => setEditing({ ...editing, userLimit: event.target.value })} />
            <Input label="Storage limit (GB)" type="number" min="1" value={editing.storageLimitGb} onChange={(event) => setEditing({ ...editing, storageLimitGb: event.target.value })} />
            <Select label="Status" value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
            <Input className="span-2" label="Short description" value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} />
            <Input
              as="textarea"
              className="span-2"
              label="Features (one per line)"
              rows={5}
              value={featureText}
              onChange={(event) => setFeatureText(event.target.value)}
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.status === "Active" ? `Disable ${confirm?.name}?` : `Enable ${confirm?.name}?`}
        message={confirm?.status === "Active"
          ? "New hospitals will not be able to choose this plan. Existing hospitals keep their current plan."
          : "This plan will be available again when registering hospitals."}
        confirmLabel={confirm?.status === "Active" ? "Disable" : "Enable"}
        tone={confirm?.status === "Active" ? "danger" : "primary"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setPlanStatus(confirm.id, confirm.status === "Active" ? "Inactive" : "Active");
          push(`${confirm.name} plan ${confirm.status === "Active" ? "disabled" : "enabled"}.`, "success");
          setConfirm(null);
        }}
      />
    </section>
  );
}

function Summary({ label, value }) {
  return (
    <div className="plans-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CompareGroup({ label, span }) {
  return (
    <tr className="group">
      <th colSpan={span} scope="colgroup">{label}</th>
    </tr>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="plan-info-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
