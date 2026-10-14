import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./Input.css";
import "./PasswordField.css";

export default function PasswordField({ label, error, hint, toggleLabel = "password", className = "", ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className={`field password-field ${error ? "has-error" : ""} ${className}`.trim()}>
      {label && <span className="field-label">{label}</span>}
      <span className="password-box">
        <input {...props} type={visible ? "text" : "password"} />
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
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
