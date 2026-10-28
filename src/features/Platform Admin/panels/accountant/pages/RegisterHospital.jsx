import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { interpretPlatformError, shouldEndPlatformSession } from "../../../shared/api/platformErrors";
import { isNumericLeadId, LEAD_FIELD_MAP, mapRegistration } from "../../../shared/api/hospitalRegistration";
import { hasPlatformAccessToken, platformAuth } from "../../../shared/api/platformSession";
import { getRegistration, registerFromLead } from "../../../shared/api/registrationApi";
import Button from "../../../shared/components/Button";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import Input from "../../../shared/components/Input";
import PhoneInput from "../../../shared/components/PhoneInput";
import PasswordField from "../../../shared/components/PasswordField";
import Select from "../../../shared/components/Select";
import { activePlanNames, catalogPrice, cyclesForPlan } from "../../../shared/api/platformPlans";
import { PLAN_NAMES, tenantStatuses, trialPeriods } from "../../../shared/data/catalog";
import { usePlatformPlans } from "../../../shared/hooks/usePlatformPlans";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import { DEFAULT_PHONE_CODE, parsePhoneNumber } from "../../../shared/utils/phoneNumbers";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { useToast } from "../../../shared/hooks/useToast";
import { accountantBackTitle, isAccountantLocation } from "../../../shared/navigation/inAppHistory";
import { useInAppBack, useInAppPrevious } from "../../../shared/navigation/InAppHistoryTracker";
import { UNIVERSAL_LOGIN, accountsPath } from "../../../shared/paths";
import { canSubmitRegistration } from "../../../shared/utils/registrationGate";
import { PASSWORD_HINT, isPostalCode, isTenantCode, passwordIssue, required } from "../../../shared/utils/validation";
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
  const contact = parsePhoneNumber(request.contactPhone || "");
  return {
    ...blank,
    name: request.hospitalName,
    type: request.type || blank.type,
    email: request.hospitalEmail || "",
    phone: contact.phone,
    phoneCode: contact.phoneCode || DEFAULT_PHONE_CODE,
    city: request.city || "",
    state: request.state || "",
    adminName: request.contactPerson || "",
    adminEmail: request.contactEmail || "",
    adminPhone: contact.phone,
    adminPhoneCode: contact.phoneCode || DEFAULT_PHONE_CODE,
    plan: request.plan || blank.plan,
    billingCycle: request.billingCycle || blank.billingCycle,
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

function Missing({ message, detail }) {
  const previous = useInAppPrevious(isAccountantLocation);
  const goBack = useInAppBack(accountsPath("/registrations"), isAccountantLocation);
  const label = previous
    ? `Back to ${accountantBackTitle(previous.pathname) || "the previous page"}`
    : "Back to Hospital Registrations";
  return (
    <section className="register-page">
      <div className="reg-panel reg-missing">
        <strong>{message}</strong>
        <span>{detail}</span>
        <button type="button" onClick={goBack}>{label}</button>
      </div>
    </section>
  );
}

export default function RegisterHospital() {
  const { id } = useParams();
  const { signOutPortal } = usePlatform();
  const signOutRef = useRef(signOutPortal);
  signOutRef.current = signOutPortal;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isNumericLeadId(id)) {
      setLoading(false);
      setError("This registration link is not a hospital lead.");
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getRegistration(id)
      .then((body) => {
        if (!cancelled) setRequest(mapRegistration(body));
      })
      .catch((err) => {
        if (cancelled) return;
        const result = interpretPlatformError(err);
        setError(result.toast);
        if (shouldEndPlatformSession(err)) signOutRef.current("accountant");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <Missing message="Loading this lead." detail="Fetching the agreed hospital from the server." />;
  }
  if (error) {
    return <Missing message="This lead could not be opened." detail={error} />;
  }
  if (!request || request.status !== "Agreed") {
    return (
      <Missing
        message="This hospital is not waiting for registration."
        detail="It may already be registered, or CRM has not marked it as agreed yet."
      />
    );
  }

  return <RegisterForm key={request.id} request={request} />;
}

function RegisterForm({ request }) {
  const navigate = useNavigate();
  const goBack = useInAppBack(accountsPath("/registrations"), isAccountantLocation);
  const { signOutPortal } = usePlatform();
  const { push } = useToast();
  const initialValues = valuesFromRequest(request);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const signedIn = hasPlatformAccessToken();
  const canSubmit = canSubmitRegistration({ signedIn, busy: submitting || confirming });
  const isTrial = values.tenantStatus === "Trial" || values.trialPeriod !== "None";
  const { plans, loading: plansLoading, error: plansError } = usePlatformPlans();
  const planNames = useMemo(() => {
    const remote = activePlanNames(plans);
    return remote.length ? remote : PLAN_NAMES;
  }, [plans]);
  const selectedPlan = plans.find((plan) => plan.name === values.plan);
  const cycleOptions = cyclesForPlan(selectedPlan);
  const listedPrice = catalogPrice(selectedPlan, values.billingCycle);

  useEffect(() => {
    if (plansLoading || plansError) return;
    if (planNames.includes(values.plan)) return;
    setValues((current) => ({
      ...current,
      plan: planNames.includes("Professional") ? "Professional" : planNames[0],
    }));
  }, [planNames, plansError, plansLoading, values.plan]);

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
    if (!isTenantCode(values.code)) next.code = "Use 3–12 letters, numbers, or hyphens.";
    if (!required(values.address)) next.address = "Address is required.";
    if (!isPostalCode(values.postalCode)) next.postalCode = "Enter a valid postal code.";
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
    setConfirming(false);
    try {
      const created = await registerFromLead(request.id, values);
      platformAuth.rememberLeadSubmission(created.id, {
        trialPeriod: values.trialPeriod,
        tenantStatus: values.tenantStatus,
      });
      const hospitalLabel = created.hospitalId != null ? `hospital ${created.hospitalId}` : "the server";
      const code = created.hospitalCode ? ` Code ${created.hospitalCode}.` : "";
      push(`${created.hospitalName} was registered as ${hospitalLabel}.${code} Trial ${values.trialPeriod}, status ${values.tenantStatus}.`, "success");
      navigate(accountsPath("/registrations"), { state: { tab: "Registered" } });
    } catch (error) {
      const result = interpretPlatformError(error, LEAD_FIELD_MAP);
      if (Object.keys(result.fieldErrors).length) setErrors((current) => ({ ...current, ...result.fieldErrors }));
      push(result.toast, "error");
      if (shouldEndPlatformSession(error)) signOutPortal("accountant");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmitRegistration({ signedIn, busy: submittingRef.current || confirming })) return;
    if (!validate()) {
      push("Check the highlighted fields before registering.", "error");
      return;
    }
    setConfirming(true);
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <section className="register-page">
      <form className="reg-layout" onSubmit={submit} noValidate>
        <div className="reg-panel">
          {!signedIn && (
            <div className="reg-error-bar" role="alert">
              Log out and sign in with your accountant account before registering. This browser does not have a backend session yet.{" "}
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
              <Input className="span-2" label={<Label text="Hospital Name" />} value={values.name} readOnly />
              <Input label={<Label text="Tenant Code" />} value={values.code} error={errors.code} placeholder="e.g. CITYGEN" onChange={(event) => setField("code", event.target.value.toUpperCase())} />
              <Select label={<Label text="Hospital Type" />} value={values.type} disabled>
                <option>{values.type}</option>
              </Select>
              <Input label={<Label text="Email Address" />} type="email" value={values.email} error={errors.email} readOnly />
              <PhoneInput label="Contact Number" value={values.phone} countryCode={values.phoneCode} disabled readOnly />
              <Input className="span-3" label={<Label text="Address" />} value={values.address} error={errors.address} onChange={(event) => setField("address", event.target.value)} />
              <Input label={<Label text="City" />} value={values.city} readOnly />
              <Input label={<Label text="State" />} value={values.state} readOnly />
              <Input label={<Label text="Postal Code" />} value={values.postalCode} error={errors.postalCode} onChange={(event) => setField("postalCode", event.target.value)} />
            </div>
          </section>

          <section className="reg-section">
            <SectionHead number="2" title="Administrator details" />
            <div className="reg-grid">
              <Input label={<Label text="Full Name" />} value={values.adminName} readOnly />
              <Input label={<Label text="Email" />} type="email" value={values.adminEmail} error={errors.adminEmail} readOnly />
              <PhoneInput label="Contact Number" value={values.adminPhone} countryCode={values.adminPhoneCode} disabled readOnly />
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
              <Button variant="secondary" onClick={goBack}>Cancel</Button>
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
            <div><dt>Trial</dt><dd>{values.trialPeriod}</dd></div>
            <div><dt>Status</dt><dd>{values.tenantStatus}</dd></div>
          </dl>
          <div className="reg-plan-box">
            <div className="reg-plan-row">
              <span>{values.plan || "No plan"}</span>
              <span>{values.billingCycle}</span>
            </div>
            <span className="reg-plan-sub">
              {isTrial
                ? `Trial: ${values.trialPeriod === "None" ? "14 days" : values.trialPeriod}. Subscription pricing does not apply during a trial.`
                : plansLoading
                  ? "Loading subscription price…"
                  : plansError
                    ? `Subscription price unavailable. ${plansError}`
                    : listedPrice == null
                      ? `Price unavailable for ${values.billingCycle} billing.`
                      : `${formatCurrency(listedPrice)}/${values.billingCycle === "Annual" ? "year" : "month"}`}
            </span>
          </div>
        </aside>
      </form>
      <ConfirmDialog
        open={confirming}
        title="Register this hospital?"
        message="You are about to create the hospital on the server. The lead will be marked registered."
        confirmLabel={submitting ? "Registering…" : "Register hospital"}
        tone="primary"
        onCancel={() => { if (!submitting) setConfirming(false); }}
        onConfirm={() => { if (canSubmitRegistration({ signedIn, busy: submittingRef.current })) finish(); }}
      />
    </section>
  );
}
