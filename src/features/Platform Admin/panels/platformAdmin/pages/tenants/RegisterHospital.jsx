import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { interpretPlatformError } from "../../../../shared/api/platformErrors";
import { TENANT_FIELD_MAP } from "../../../../shared/api/hospitalRegistration";
import { hasPlatformAccessToken, platformAuth } from "../../../../shared/api/platformSession";
import { registerTenant } from "../../../../shared/api/registrationApi";
import Button from "../../../../shared/components/Button";
import Input from "../../../../shared/components/Input";
import PhoneInput from "../../../../shared/components/PhoneInput";
import PasswordField from "../../../../shared/components/PasswordField";
import Select from "../../../../shared/components/Select";
import { activePlanNames, catalogPrice, cyclesForPlan } from "../../../../shared/api/platformPlans";
import { PLAN_NAMES, hospitalTypes, tenantStatuses, trialPeriods } from "../../../../shared/data/catalog";
import { usePlatformPlans } from "../../../../shared/hooks/usePlatformPlans";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { useToast } from "../../../../shared/hooks/useToast";
import { isPlatformAdminLocation } from "../../../../shared/navigation/inAppHistory";
import { useInAppBack } from "../../../../shared/navigation/useInAppHistory";
import { PLATFORM_BASE, UNIVERSAL_LOGIN, platformPath } from "../../../../shared/paths";
import { canSubmitRegistration } from "../../../../shared/utils/registrationGate";
import { DEFAULT_PHONE_CODE, validPhoneForCode } from "../../../../shared/utils/phoneNumbers";
import { PASSWORD_HINT, isEmail, isPostalCode, isTenantCode, passwordIssue, required } from "../../../../shared/utils/validation";
import "./RegisterHospital.css";

const blank = {
  name: "",
  code: "",
  type: "General",
  email: "",
  phone: "",
  phoneCode: DEFAULT_PHONE_CODE,
  address: "",
  city: "",
  state: "",
  postalCode: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminPhoneCode: DEFAULT_PHONE_CODE,
  adminPassword: "",
  adminPasswordConfirm: "",
  plan: "Professional",
  billingCycle: "Monthly",
  trialPeriod: "None",
  tenantStatus: "Active",
};

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
  const cancel = useInAppBack(platformPath("/hospitals"), isPlatformAdminLocation);
  const { signOutPortal } = usePlatform();
  const { push } = useToast();
  const initialValues = blank;
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const signedIn = hasPlatformAccessToken();
  const canSubmit = canSubmitRegistration({ signedIn, busy: submitting });
  const isTrial = values.tenantStatus === "Trial" || values.trialPeriod !== "None";
  const { plans, error: plansError } = usePlatformPlans();
  const planNames = useMemo(() => {
    const remote = activePlanNames(plans);
    return remote.length ? remote : PLAN_NAMES;
  }, [plans]);
  const selectedPlan = plans.find((plan) => plan.name === values.plan);
  const cycleOptions = cyclesForPlan(selectedPlan);
  const listedPrice = catalogPrice(selectedPlan, values.billingCycle);

  useEffect(() => {
    if (planNames.includes(values.plan)) return;
    setValues((current) => ({
      ...current,
      plan: planNames.includes("Professional") ? "Professional" : planNames[0],
    }));
  }, [planNames, values.plan]);

  useEffect(() => {
    if (cycleOptions.includes(values.billingCycle)) return;
    setValues((current) => ({ ...current, billingCycle: cycleOptions[0] }));
  }, [cycleOptions, values.billingCycle]);

  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!required(values.name)) next.name = "Hospital name is required.";
    if (!isTenantCode(values.code)) next.code = "Use 3–12 letters, numbers, or hyphens.";
    if (!required(values.type)) next.type = "Hospital type is required.";
    if (!isEmail(values.email)) next.email = "Enter a valid email address.";
    if (!validPhoneForCode(values.phone, values.phoneCode)) next.phone = values.phoneCode === DEFAULT_PHONE_CODE ? "Enter a 10-digit phone number." : "Enter a valid phone number for the selected country code.";
    if (!required(values.address)) next.address = "Address is required.";
    if (!required(values.city)) next.city = "City is required.";
    if (!required(values.state)) next.state = "State is required.";
    if (!isPostalCode(values.postalCode)) next.postalCode = "Enter a valid postal code.";
    if (!required(values.adminName)) next.adminName = "Administrator name is required.";
    if (!isEmail(values.adminEmail)) next.adminEmail = "Enter a valid administrator email.";
    if (!validPhoneForCode(values.adminPhone, values.adminPhoneCode)) next.adminPhone = values.adminPhoneCode === DEFAULT_PHONE_CODE ? "Enter a 10-digit phone number." : "Enter a valid phone number for the selected country code.";
    const passwordError = passwordIssue(values.adminPassword);
    if (passwordError) next.adminPassword = passwordError;
    if (!values.adminPasswordConfirm) next.adminPasswordConfirm = "Re-enter the password.";
    else if (values.adminPasswordConfirm !== values.adminPassword) next.adminPasswordConfirm = "Passwords do not match.";
    if (!required(values.plan)) next.plan = "Choose a subscription plan.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const finish = async () => {
    if (!canSubmitRegistration({ signedIn, busy: submittingRef.current })) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const created = await registerTenant(values);
      if (created?.tenant_id == null) {
        push("Registration did not return a tenant id. Nothing was saved in this browser.", "error");
        return;
      }
      platformAuth.rememberRegisteredTenant(created);
      push(`${created.name} was registered.`, "success");
      navigate(`${PLATFORM_BASE}/hospitals/${created.tenant_id}`, { state: { registeredTenant: created } });
    } catch (error) {
      const result = interpretPlatformError(error, TENANT_FIELD_MAP);
      if (Object.keys(result.fieldErrors).length) setErrors((current) => ({ ...current, ...result.fieldErrors }));
      push(result.toast, "error");
      if (result.unauthenticated && signedIn) signOutPortal("platform");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmitRegistration({ signedIn, busy: submittingRef.current })) return;
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
          {!signedIn && (
            <div className="reg-error-bar" role="alert">
              Log out and sign in with your platform account before registering. This browser does not have a backend session yet.{" "}
              <Link to={UNIVERSAL_LOGIN}>Go to sign in</Link>
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
              <PhoneInput label="Contact Number" required value={values.phone} countryCode={values.phoneCode} error={errors.phone} onChange={(event) => setField("phone", event.target.value)} onCountryCodeChange={(event) => setField("phoneCode", event.target.value)} />
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
              <PhoneInput label="Contact Number" required value={values.adminPhone} countryCode={values.adminPhoneCode} error={errors.adminPhone} onChange={(event) => setField("adminPhone", event.target.value)} onCountryCodeChange={(event) => setField("adminPhoneCode", event.target.value)} />
              <PasswordField label={<Label text="Password" />} value={values.adminPassword} error={errors.adminPassword} hint={PASSWORD_HINT} autoComplete="new-password" onChange={(event) => setField("adminPassword", event.target.value)} />
              <PasswordField label={<Label text="Confirm Password" />} value={values.adminPasswordConfirm} error={errors.adminPasswordConfirm} autoComplete="new-password" onChange={(event) => setField("adminPasswordConfirm", event.target.value)} />
            </div>
          </section>

          <section className="reg-section">
            <SectionHead number="3" title="Subscription configuration" />
            <div className="reg-grid reg-grid-4">
              <Select label={<Label text="Subscription Plan" />} value={values.plan} error={errors.plan} onChange={(event) => setField("plan", event.target.value)}>
                {planNames.map((plan) => <option key={plan}>{plan}</option>)}
              </Select>
              <Select label={<Label text="Billing Cycle" />} value={values.billingCycle} onChange={(event) => setField("billingCycle", event.target.value)}>
                {cycleOptions.map((cycle) => <option key={cycle}>{cycle}</option>)}
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
              <Button variant="secondary" onClick={cancel}>Cancel</Button>
              <Button variant="secondary" onClick={() => { setValues(initialValues); setErrors({}); }}>Reset</Button>
              <Button type="submit" disabled={!canSubmit}>{submitting ? "Registering…" : "Register Hospital"}</Button>
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
            <span className="reg-plan-sub">
              {isTrial ? `Trial: ${values.trialPeriod === "None" ? "14 days" : values.trialPeriod}` : values.billingCycle}
              {listedPrice != null ? `. Catalog price ${formatCurrency(listedPrice)}.` : ". Catalog price loads with the plan list."}
              {plansError ? ` ${plansError}` : ""}
            </span>
          </div>
        </aside>
      </form>
    </section>
  );
}
