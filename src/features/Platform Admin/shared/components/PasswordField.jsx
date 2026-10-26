import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { fieldA11y } from "./fieldA11y";
import "./Input.css";
import "./PasswordField.css";

export default function PasswordField({
  label,
  error,
  hint,
  toggleLabel = "password",
  className = "",
  id,
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const controlId = id || generatedId;
  const hintId = hint && !error ? `${controlId}-hint` : "";
  const a11y = fieldA11y({
    id: controlId,
    error,
    describedBy: [describedBy, hintId].filter(Boolean).join(" ") || undefined,
    ariaInvalid,
  });
  return (
    <label className={`field password-field ${a11y.invalid ? "has-error" : ""} ${className}`.trim()} htmlFor={controlId}>
      {label && <span className="field-label">{label}</span>}
      <span className="password-box">
        <input {...props} {...a11y.inputProps} type={visible ? "text" : "password"} />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </span>
      {a11y.errorId ? <span className="field-error" id={a11y.errorId}>{error}</span> : hint && <span className="field-hint" id={hintId}>{hint}</span>}
    </label>
  );
}
