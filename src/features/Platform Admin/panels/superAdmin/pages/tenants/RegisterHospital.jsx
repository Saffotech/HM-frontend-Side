import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../../../shared/components/Button";
import Input from "../../../../shared/components/Input";
import PasswordField from "../../../../shared/components/PasswordField";
import Select from "../../../../shared/components/Select";
import { billingCycles, hospitalTypes, tenantStatuses, trialPeriods } from "../../../../shared/data/plansData";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { useToast } from "../../../../shared/hooks/useToast";
import { PLATFORM_BASE, platformPath } from "../../../../shared/paths";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { priceFor } from "../../../../shared/utils/hospitals";
import { PASSWORD_HINT, isEmail, isPhone, isPostalCode, isTenantCode, passwordIssue, required } from "../../../../shared/utils/validation";
import "./RegisterHospital.css";

const blank = {
  name: "",
  code: "",
  type: "General",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminPassword: "",
  adminPasswordConfirm: "",
  plan: "Professional",
  billingCycle: "Monthly",
  trialPeriod: "None",
  tenantStatus: "Active",
};

function valuesFromRequest(request) {
  if (!request) return blank;
  return {
    ...blank,
    name: request.hospitalName,
    type: request.type,
    email: request.hospitalEmail,
    phone: request.contactPhone,
    city: request.city,
    state: request.state,
    adminName: request.contactPerson,
    adminEmail: request.contactEmail,
    adminPhone: request.contactPhone,
    plan: request.plan,
    billingCycle: request.billingCycle,
  };
}

function Label({ text, optional = false }) {
  return (
    <>
      {text}
      {!optional && <span className="req" aria-hidden="true"> *</span>}
    </>
  );
}

function SectionHead({ number, title }) {
  return (
    <header className="reg-section-head">
      <span className="reg-step">{number}</span>
      <h2>{title}</h2>
    </header>
  );
}

export default function RegisterHospital() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hospitals, onboarding, plans, addHospital } = usePlatform();
  const { push } = useToast();
  const sourceRequest = onboarding.find((item) => (
    item.id === searchParams.get("request")
    && item.status !== "Registered"
  )) || null;
  const initialValues = valuesFromRequest(sourceRequest);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const activePlans = plans.filter((plan) => plan.status === "Active");
  const selectedPlan = plans.find((plan) => plan.name === values.plan);
  const isTrial = values.tenantStatus === "Trial" || values.trialPeriod !== "None";
  const pricing = priceFor(selectedPlan, values.billingCycle, isTrial);

  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!required(values.name)) next.name = "Hospital name is required.";
    if (!isTenantCode(values.code)) next.code = "Use 3–12 letters, numbers, or hyphens.";
    const code = values.code.trim().toUpperCase();
    const duplicate = hospitals.some((hospital) => hospital.code.toUpperCase() === code);
    if (!next.code && duplicate) next.code = "This tenant code is already used by another hospital.";
    if (!required(values.type)) next.type = "Hospital type is required.";
    if (!isEmail(values.email)) next.email = "Enter a valid email address.";
    if (!isPhone(values.phone)) next.phone = "Enter a valid phone number.";
    if (!required(values.address)) next.address = "Address is required.";
    if (!required(values.city)) next.city = "City is required.";
    if (!required(values.state)) next.state = "State is required.";
    if (!isPostalCode(values.postalCode)) next.postalCode = "Enter a valid postal code.";
    if (!required(values.adminName)) next.adminName = "Administrator name is required.";
    if (!isEmail(values.adminEmail)) next.adminEmail = "Enter a valid administrator email.";
    if (!isPhone(values.adminPhone)) next.adminPhone = "Enter a valid administrator phone.";
    const passwordError = passwordIssue(values.adminPassword);
    if (passwordError) next.adminPassword = passwordError;
    if (!values.adminPasswordConfirm) next.adminPasswordConfirm = "Re-enter the password.";
    else if (values.adminPasswordConfirm !== values.adminPassword) next.adminPasswordConfirm = "Passwords do not match.";
    if (!required(values.plan)) next.plan = "Choose a subscription plan.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const finish = () => {
    const created = addHospital(values, sourceRequest?.id);
    push(`${created.name} was registered.`, "success");
    navigate(`${PLATFORM_BASE}/hospitals/${created.id}`);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) {
      push("Check the highlighted fields before registering.", "error");
      return;
    }
    finish();
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <section className="register-page">
      <form className="reg-layout" onSubmit={submit} noValidate>
        <div className="reg-panel">
          {sourceRequest && (
            <div className="reg-source-bar">
              <span>From onboarding request</span>
              <Link to={platformPath("/crm-performance")} className="mono">{sourceRequest.id}</Link>
              <span>·</span>
              <strong>{sourceRequest.hospitalName}</strong>
            </div>
          )}
          {errorCount > 0 && (
            <div className="reg-error-bar" role="alert">
              {errorCount} field{errorCount === 1 ? " needs" : "s need"} attention before the hospital can be registered.
            </div>
          )}

          <section className="reg-section">
            <SectionHead number="1" title="Organization details" />
            <div className="reg-grid">
              <Input className="span-2" label={<Label text="Hospital Name" />} value={values.name} error={errors.name} onChange={(event) => setField("name", event.target.value)} />
              <Input label={<Label text="Tenant Code" />} value={values.code} error={errors.code} placeholder="e.g. CITYGEN" onChange={(event) => setField("code", event.target.value.toUpperCase())} />
              <Select label={<Label text="Hospital Type" />} value={values.type} error={errors.type} onChange={(event) => setField("type", event.target.value)}>
                {hospitalTypes.map((type) => <option key={type}>{type}</option>)}
              </Select>
              <Input label={<Label text="Email Address" />} type="email" value={values.email} error={errors.email} onChange={(event) => setField("email", event.target.value)} />
              <Input label={<Label text="Contact Number" />} value={values.phone} error={errors.phone} placeholder="+91 80 4000 2100" onChange={(event) => setField("phone", event.target.value)} />
              <Input className="span-3" label={<Label text="Address" />} value={values.address} error={errors.address} onChange={(event) => setField("address", event.target.value)} />
              <Input label={<Label text="City" />} value={values.city} error={errors.city} onChange={(event) => setField("city", event.target.value)} />
              <Input label={<Label text="State" />} value={values.state} error={errors.state} onChange={(event) => setField("state", event.target.value)} />
              <Input label={<Label text="Postal Code" />} value={values.postalCode} error={errors.postalCode} onChange={(event) => setField("postalCode", event.target.value)} />
            </div>
          </section>

          <section className="reg-section">
            <SectionHead number="2" title="Administrator details" />
            <div className="reg-grid">
              <Input label={<Label text="Full Name" />} value={values.adminName} error={errors.adminName} onChange={(event) => setField("adminName", event.target.value)} />
              <Input label={<Label text="Email" />} type="email" value={values.adminEmail} error={errors.adminEmail} onChange={(event) => setField("adminEmail", event.target.value)} />
              <Input label={<Label text="Contact Number" />} value={values.adminPhone} error={errors.adminPhone} onChange={(event) => setField("adminPhone", event.target.value)} />
              <PasswordField label={<Label text="Password" />} value={values.adminPassword} error={errors.adminPassword} hint={PASSWORD_HINT} autoComplete="new-password" onChange={(event) => setField("adminPassword", event.target.value)} />
              <PasswordField label={<Label text="Confirm Password" />} value={values.adminPasswordConfirm} error={errors.adminPasswordConfirm} autoComplete="new-password" onChange={(event) => setField("adminPasswordConfirm", event.target.value)} />
            </div>
          </section>

          <section className="reg-section">
            <SectionHead number="3" title="Subscription configuration" />
            <div className="reg-grid reg-grid-4">
              <Select label={<Label text="Subscription Plan" />} value={values.plan} error={errors.plan} onChange={(event) => setField("plan", event.target.value)}>
                {activePlans.map((plan) => <option key={plan.id}>{plan.name}</option>)}
              </Select>
              <Select label={<Label text="Billing Cycle" />} value={values.billingCycle} onChange={(event) => setField("billingCycle", event.target.value)}>
                {billingCycles.map((cycle) => <option key={cycle}>{cycle}</option>)}
              </Select>
              <Select label={<Label text="Trial Period" />} value={values.trialPeriod} onChange={(event) => setField("trialPeriod", event.target.value)}>
                {trialPeriods.map((period) => <option key={period}>{period}</option>)}
              </Select>
              <Select label={<Label text="Tenant Status" />} value={values.tenantStatus} onChange={(event) => setField("tenantStatus", event.target.value)}>
                {tenantStatuses.map((status) => <option key={status}>{status}</option>)}
              </Select>
            </div>
          </section>

          <footer className="reg-footer">
            <span className="reg-footnote"><span className="req">*</span> Required field</span>
            <div className="reg-footer-actions">
              <Button variant="secondary" onClick={() => navigate(platformPath(sourceRequest ? "/crm-performance" : "/hospitals"))}>Cancel</Button>
              <Button variant="secondary" onClick={() => { setValues(initialValues); setErrors({}); }}>Reset</Button>
              <Button type="submit">Register Hospital</Button>
            </div>
          </footer>
        </div>

        <aside className="reg-summary">
          <h3>Registration summary</h3>
          <dl>
            <div><dt>Hospital</dt><dd>{values.name.trim() || "—"}</dd></div>
            <div><dt>Tenant code</dt><dd className="mono">{values.code.trim() || "—"}</dd></div>
            <div><dt>Type</dt><dd>{values.type}</dd></div>
            <div><dt>Location</dt><dd>{[values.city, values.state].filter((part) => part.trim()).join(", ") || "—"}</dd></div>
            <div><dt>Administrator</dt><dd>{values.adminName.trim() || "—"}</dd></div>
          </dl>
          <div className="reg-plan-box">
            <div className="reg-plan-row">
              <span>{values.plan || "No plan"}</span>
              <span>{values.billingCycle}</span>
            </div>
            <strong>{formatCurrency(pricing.amount)}</strong>
            <span className="reg-plan-sub">
              {isTrial ? `Trial: ${values.trialPeriod === "None" ? "14 days" : values.trialPeriod}, no charge` : `per ${values.billingCycle === "Annual" ? "year" : "month"}`}
            </span>
            {selectedPlan && (
              <ul>
                <li>{selectedPlan.userLimit} users</li>
                <li>{selectedPlan.storageLimitGb} GB storage</li>
                <li>{selectedPlan.tenantLimit}</li>
              </ul>
            )}
          </div>
        </aside>
      </form>
    </section>
  );
}
