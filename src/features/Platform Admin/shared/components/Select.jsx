import "./Input.css";
import "./Select.css";

export default function Select({ label, error, children, className = "", ...props }) {
  return (
    <label className={`field ${error ? "has-error" : ""} ${className}`.trim()}>
      {label && <span className="field-label">{label}</span>}
      <select {...props}>{children}</select>
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
