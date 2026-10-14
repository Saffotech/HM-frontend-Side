import { useEffect, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Circle, KeyRound, Loader2 } from "lucide-react";
import Button from "../../components/Button";
import PasswordField from "../../components/PasswordField";
import { useToast } from "../../hooks/useToast";
import { changePortalPassword, PortalAccountError } from "../../services/portalAccount";

const BLANK = { current: "", next: "", confirm: "" };

function passwordErrors({ current, next, confirm }) {
  return {
    current: current ? "" : "Enter your current password.",
    next: !next ? "Enter a new password."
      : next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next) ? "Meet all the requirements below."
        : next === current ? "Choose a password different from your current one." : "",
    confirm: !confirm ? "Confirm your new password." : confirm !== next ? "Passwords don't match." : "",
  };
}

export default function ChangePasswordCard({ onDirtyChange }) {
  const { push } = useToast();
  const [values, setValues] = useState(BLANK);
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const dirty = Object.values(values).some(Boolean);
  const errors = passwordErrors(values);
  const valid = !Object.values(errors).some(Boolean);
  const requirements = [
    { label: "At least 8 characters", met: values.next.length >= 8 },
    { label: "A letter and a number", met: /[A-Za-z]/.test(values.next) && /\d/.test(values.next) },
    { label: "Different from current password", met: Boolean(values.next) && values.next !== values.current },
  ];

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const field = (key) => ({
    value: values[key],
    error: touched[key] ? errors[key] : "",
    "aria-invalid": Boolean(touched[key] && errors[key]),
    disabled: busy,
    onChange: (event) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
      setResult(null);
    },
    onBlur: () => setTouched((current) => ({ ...current, [key]: Boolean(values[key]) || current[key] })),
  });

  const submit = async (event) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setResult(null);
    try {
      await changePortalPassword({ currentPassword: values.current, newPassword: values.next });
      setResult({ ok: true, text: "Your password was changed." });
      push("Password changed.", "success");
    } catch (error) {
      setResult({ ok: false, text: error instanceof PortalAccountError ? error.message : "Your password could not be changed. Try again." });
    } finally {
      setValues(BLANK);
      setTouched({});
      setBusy(false);
    }
  };

  return (
    <section className="pp-card" aria-labelledby="pp-security">
      <header className="pp-card-head">
        <span className="pp-card-icon" aria-hidden="true"><KeyRound size={16} /></span>
        <div>
          <h3 id="pp-security">Change password</h3>
          <p>Passwords are never stored in this browser.</p>
        </div>
      </header>
      <form className="pp-password-form" noValidate onSubmit={submit}>
        <PasswordField label="Current password" toggleLabel="current password" autoComplete="current-password" {...field("current")} />
        <div className="pp-password-pair">
          <PasswordField label="New password" toggleLabel="new password" autoComplete="new-password" aria-describedby="pp-password-reqs" {...field("next")} />
          <PasswordField label="Confirm new password" toggleLabel="confirmed password" autoComplete="new-password" {...field("confirm")} />
        </div>
        {result && (
          <p className={`pp-alert ${result.ok ? "pp-alert-success" : "pp-alert-error"}`} role={result.ok ? "status" : "alert"}>
            {result.ok ? <CheckCircle2 size={15} aria-hidden="true" /> : <AlertCircle size={15} aria-hidden="true" />}
            {result.text}
          </p>
        )}
        <div className="pp-password-foot">
          <ul id="pp-password-reqs" className="pp-reqs" aria-label="Password requirements">
            {requirements.map((item) => (
              <li key={item.label} className={item.met ? "is-met" : ""}>
                {item.met ? <Check size={13} aria-hidden="true" /> : <Circle size={11} aria-hidden="true" />}
                {item.label}
                <span className="pp-sr-only">{item.met ? " (met)" : " (not met)"}</span>
              </li>
            ))}
          </ul>
          <Button type="submit" disabled={!valid || busy}>
            {busy ? <><Loader2 size={15} className="pp-spin" aria-hidden="true" />Saving…</> : "Save password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
