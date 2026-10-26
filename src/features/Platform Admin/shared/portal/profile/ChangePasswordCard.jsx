import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Circle, KeyRound, Loader2 } from "lucide-react";
import { interpretPlatformError, platformCallMessage, shouldEndPlatformSession } from "../../api/platformErrors";
import { platformPasswordIssue } from "../../api/platformProfileModel";
import Button from "../../components/Button";
import PasswordField from "../../components/PasswordField";

const BLANK = { current: "", next: "", confirm: "" };
const PASSWORD_FIELDS = {
  current_password: "current",
  new_password: "next",
  confirm_password: "confirm",
};

function passwordErrors(values) {
  const issue = platformPasswordIssue(values.current, values.next, values.confirm);
  return {
    current: issue.current_password || "",
    next: issue.new_password || "",
    confirm: issue.confirm_password || "",
  };
}

export default function ChangePasswordCard({ changePassword, onDirtyChange, onSuccess, onSessionEnd }) {
  const [values, setValues] = useState(BLANK);
  const [touched, setTouched] = useState({});
  const [apiErrors, setApiErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [result, setResult] = useState(null);
  const dirty = Object.values(values).some(Boolean);
  const errors = passwordErrors(values);
  const requirements = [
    { label: "8 to 128 characters", met: values.next.length >= 8 && values.next.length <= 128 },
    { label: "A letter and a number", met: /[A-Za-z]/.test(values.next) && /\d/.test(values.next) },
    { label: "Different from current password", met: Boolean(values.next) && values.next !== values.current },
    { label: "Confirmation matches", met: Boolean(values.confirm) && values.confirm === values.next },
  ];

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const field = (key) => ({
    value: values[key],
    error: apiErrors[key] || (touched[key] ? errors[key] : ""),
    "aria-invalid": Boolean(apiErrors[key] || (touched[key] && errors[key])),
    disabled: busy,
    onChange: (event) => {
      setValues((current) => ({ ...current, [key]: event.target.value }));
      setApiErrors((current) => ({ ...current, [key]: "" }));
      setResult(null);
    },
    onBlur: () => setTouched((current) => ({ ...current, [key]: true })),
  });

  const submit = async (event) => {
    event.preventDefault();
    if (busyRef.current) return;
    setTouched({ current: true, next: true, confirm: true });
    setApiErrors({});
    if (Object.values(errors).some(Boolean)) return;
    if (typeof changePassword !== "function") {
      setResult({ ok: false, text: "Password change could not be sent." });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setResult(null);
    try {
      const body = await changePassword(values.current, values.next);
      const text = typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : "Your password was changed. Sign in again.";
      setValues(BLANK);
      setTouched({});
      setResult({ ok: true, text });
      onSuccess?.(text);
    } catch (error) {
      const interpreted = interpretPlatformError(error, PASSWORD_FIELDS);
      setApiErrors({
        current: interpreted.fieldErrors.current || "",
        next: interpreted.fieldErrors.next || "",
        confirm: interpreted.fieldErrors.confirm || "",
      });
      const text = error?.code === "invalid_password"
        ? (error.message || "Current password is incorrect.")
        : (error?.status === 422 ? "Check the highlighted fields." : platformCallMessage(error));
      setResult({ ok: false, text });
      if (shouldEndPlatformSession(error)) onSessionEnd?.();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="pp-card" aria-labelledby="pp-security">
      <header className="pp-card-head">
        <div className="pp-card-heading">
          <h3 id="pp-security"><KeyRound size={16} aria-hidden="true" />Change password</h3>
          <span>Passwords stay in this form until you submit. A successful change signs you out.</span>
        </div>
      </header>
      <form className="pp-password-form" noValidate onSubmit={submit}>
        <PasswordField label="Current password" toggleLabel="current password" autoComplete="current-password" {...field("current")} />
        <div className="pp-password-pair">
          <PasswordField label="New password" toggleLabel="new password" autoComplete="new-password" maxLength={128} aria-describedby="pp-password-reqs" {...field("next")} />
          <PasswordField label="Confirm new password" toggleLabel="confirmed password" autoComplete="new-password" maxLength={128} {...field("confirm")} />
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
          <Button type="submit" disabled={busy}>
            {busy ? <><Loader2 size={15} className="pp-spin" aria-hidden="true" />Saving…</> : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
